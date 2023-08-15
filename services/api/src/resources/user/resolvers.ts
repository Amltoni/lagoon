import * as R from 'ramda';
import { ResolverFn } from '../';
import { query, isPatchEmpty } from '../../util/db';
import { Sql } from './sql';

export const getMe: ResolverFn = async (_root, args, { models, keycloakGrant: grant }) => {
  const currentUserId: string = grant.access_token.content.sub;
  return models.UserModel.loadUserById(currentUserId);
}

class SearchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchInputError';
  }
}

class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}


export const getUserBySshKey: ResolverFn = async (
  _root,
  { sshKey },
  { sqlClientPool, models, hasPermission, userActivityLogger },
) => {
  await hasPermission('user', 'getBySshKey');

  const [keyType, keyValue] = R.compose(
    R.split(' '),
    R.defaultTo(''),
    // @ts-ignore
  )(sshKey);

  if(!keyType || !keyValue) {
    throw new SearchInputError("Malformed ssh key provided. Should begin with key-type (eg. ssh-rsa|ssh-ed25519|etc.), then a space, then the key's value");
  }

  const rows = await query(
    sqlClientPool,
    Sql.selectUserIdBySshKey({ keyType, keyValue }),
  );
  const userId = R.map(R.prop('usid'), rows);

  const user = await models.UserModel.loadUserById(userId);

  userActivityLogger(`User queried getUserBySshKey`, {
    project: '',
    event: 'api:getUserBySshKey',
    payload: { sshKey: sshKey },
  }, 'user_query');

  return user;
};

export const getUserBySshFingerprint: ResolverFn = async (
  _root,
  { fingerprint },
  { sqlClientPool, models, hasPermission, userActivityLogger },
) => {
  await hasPermission('user', 'getBySshKey');

  if(!fingerprint) {
    throw new SearchInputError("Malformed ssh key fingerprint provided");
  }

  userActivityLogger(`User queried getUserBySshFingerprint`, {
    project: '',
    event: 'api:getUserBySshFingerprint',
    payload: { fingerprint: fingerprint },
  }, 'user_query');

  try {
    const rows = await query(
      sqlClientPool,
      Sql.selectUserIdBySshFingerprint({keyFingerprint: fingerprint}),
    );
    const userId = R.map(R.prop('usid'), rows);
    const user = await models.UserModel.loadUserById(userId);
    return user;
  } catch (err) {
    throw new UserNotFoundError("No user found matching provided fingerprint");
  }
};

// query to get all users, with some inputs to limit the search to specific email, id, or gitlabId
export const getAllUsers: ResolverFn = async (
  _root,
  { id, email, gitlabId },
  { sqlClientPool, models, hasPermission, userActivityLogger },
) => {
  await hasPermission('user', 'viewAll');

  userActivityLogger(`User queried getAllUsers`, {
    project: '',
    event: 'api:getAllUsers',
    payload: { id: id, email: email, gitlabId: gitlabId },
  }, 'user_query');

  const users = await models.UserModel.loadAllUsers();
  if (id) {
    const filteredById = users.filter(function (item) {
      return item.id === id;
    });
    return filteredById;
  }
  if (email) {
    const filteredByEmail = users.filter(function (item) {
      return item.email === email;
    });
    return filteredByEmail;
  }
  if (gitlabId) {
    const filteredByGitlab = users.filter(function (item) {
      return item.gitlabId === gitlabId;
    });
    return filteredByGitlab;
  }

  return users;
};

// query to get all users, with some inputs to limit the search to specific email, id, or gitlabId
export const getUserByEmail: ResolverFn = async (
  _root,
  { email },
  { sqlClientPool, models, hasPermission, userActivityLogger },
) => {
  await hasPermission('user', 'viewAll');

  const user = await models.UserModel.loadUserByUsername(email);

  userActivityLogger(`User queried getUserByEmail`, {
    project: '',
    event: 'api:getUserByEmail',
    payload: { email: email },
  }, 'user_query');

  return user;
};

export const addUser: ResolverFn = async (
  _root,
  { input },
  { models, hasPermission },
) => {
  await hasPermission('user', 'add');

  const user = await models.UserModel.addUser({
    email: input.email,
    username: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    comment: input.comment,
    gitlabId: input.gitlabId,
  });

  return user;
};

export const updateUser: ResolverFn = async (
  _root,
  { input: { user: userInput, patch } },
  { models, hasPermission },
) => {
  if (isPatchEmpty({ patch })) {
    throw new Error('Input patch requires at least 1 attribute');
  }

  const user = await models.UserModel.loadUserByIdOrUsername({
    id: R.prop('id', userInput),
    username: R.prop('email', userInput),
  });

  await hasPermission('user', 'update', {
    users: [user.id],
  });

  const updatedUser = await models.UserModel.updateUser({
    id: user.id,
    email: patch.email,
    username: patch.email,
    firstName: patch.firstName,
    lastName: patch.lastName,
    comment: patch.comment,
    gitlabId: patch.gitlabId,
  });

  return updatedUser;
};

export const deleteUser: ResolverFn = async (
  _root,
  { input: { user: userInput } },
  { models, hasPermission },
) => {
  const user = await models.UserModel.loadUserByIdOrUsername({
    id: R.prop('id', userInput),
    username: R.prop('email', userInput),
  });

  await hasPermission('user', 'delete', {
    users: [user.id],
  });

  await models.UserModel.deleteUser(user.id);

  return 'success';
};

export const deleteAllUsers: ResolverFn = async (
  _root,
  _args,
  { models, hasPermission },
) => {
  await hasPermission('user', 'deleteAll');

  const users = await models.UserModel.loadAllUsers();

  let deleteErrors: String[] = [];
  for (const user of users) {
    try {
      await models.UserModel.deleteUser(user.id)
    } catch (err) {
      deleteErrors = [
        ...deleteErrors,
        `${user.email} (${user.id})`,
      ]
    }
  }

  return R.ifElse(
    R.isEmpty,
    R.always('success'),
    deleteErrors => { throw new Error(`Could not delete users: ${deleteErrors.join(', ')}`) },
  )(deleteErrors);
};
