#!/bin/sh
export KC_DB=$DB_VENDOR
export KC_DB_USERNAME=$DB_USER
export KC_DB_PASSWORD=$DB_PASSWORD
export KC_DB_URL=jdbc:$DB_VENDOR://$DB_ADDR:3306/$DB_DATABASE

export KC_PROXY=${KC_PROXY:-edge}
export KC_HOSTNAME_STRICT=${KC_HOSTNAME_STRICT:-false}
export KC_HOSTNAME_STRICT_HTTPS=${KC_HOSTNAME_STRICT_HTTPS:-false}
export KC_HTTP_RELATIVE_PATH=${KC_HTTP_RELATIVE_PATH:-/auth}
export KC_HOSTNAME_URL=${KEYCLOAK_FRONTEND_URL}

# this may need to be changed to an optional override and only set for k3d testing so that it allows access to
# the admin page in a k3d deployed environment locally
export KC_HOSTNAME_ADMIN_URL=${KEYCLOAK_FRONTEND_URL}

export KC_DB_POOL_MAX_SIZE=${KEYCLOAK_DS_MAX_POOL_SIZE:-20}
export KC_DB_POOL_MIN_SIZE=${KEYCLOAK_DS_MIN_POOL_SIZE:-0}

KEYCLOAK_USER=$KEYCLOAK_ADMIN_USER KEYCLOAK_PASSWORD=$KEYCLOAK_ADMIN_PASSWORD KEYCLOAK_ADMIN=$KEYCLOAK_ADMIN_USER /lagoon/kc-startup.sh "$@"
