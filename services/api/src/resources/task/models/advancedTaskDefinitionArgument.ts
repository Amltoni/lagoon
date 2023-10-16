import { query } from '../../../util/db';
import * as R from 'ramda';

export class ArgumentBase {
    async validateInput(argumentName, input): Promise<boolean> {
        return true;
    }

    public static typeName() {
        return "BASE";
    }

    public async getArgumentRange() {
        return [];
    }
}

export class EnvironmentSourceArgument extends ArgumentBase {

    protected sqlClientPool;
    protected environmentId;
    protected environmentNameList = [];

    constructor(sqlClientPool, environmentId) {
        super();
        this.sqlClientPool = sqlClientPool;
        this.environmentId = environmentId;
    }

    public static typeName() {
        return "ENVIRONMENT_SOURCE_NAME";
    }

    public async getArgumentRange() {
        await this.loadEnvNames();
        return this.environmentNameList;
    }

    protected async loadEnvNames() {
        const rows = await query(
            this.sqlClientPool,
            `select e.name as name from environment as e inner join environment as p on e.project = p.project where p.id = ${this.environmentId}`
        );
        this.environmentNameList = R.pluck('name')(rows);
    }

    /**
     *
     * @param input Environment name
     * @returns boolean
     */
    async validateInput(argumentName, input): Promise<boolean> {
        await this.loadEnvNames();
        return this.environmentNameList.includes(input);
    }
}


export class OtherEnvironmentSourceNamesArgument extends ArgumentBase {

    protected sqlClientPool;
    protected environmentId;
    protected environmentNameList = [];

    constructor(sqlClientPool, environmentId) {
        super();
        this.sqlClientPool = sqlClientPool;
        this.environmentId = environmentId;
    }

    public static typeName() {
        return "ENVIRONMENT_SOURCE_NAME_EXCLUDE_SELF";
    }

    public async getArgumentRange() {
        await this.loadEnvNames();
        return this.environmentNameList;
    }

    protected async loadEnvNames() {
        const rows = await query(
            this.sqlClientPool,
            `select e.name as name from environment as e inner join environment as p on e.project = p.project where p.id = ${this.environmentId} and e.id != ${this.environmentId}`
        );
        this.environmentNameList = R.pluck('name')(rows);
    }

    /**
     *
     * @param input Environment name
     * @returns boolean
     */
    async validateInput(argumentName, input): Promise<boolean> {
        await this.loadEnvNames();
        return this.environmentNameList.includes(input);
    }
}


export class StringArgument extends ArgumentBase {

    public static typeName() {
        return "STRING";
    }

    async validateInput(argumentName, input): Promise<boolean> {
        return true;
    }

    public async getArgumentRange() {
        return null;
    }
}


export class NumberArgument {

    public static typeName() {
        return "NUMERIC";
    }

    async validateInput(argumentName, input): Promise<boolean> {
        return /^[0-9\.]+$/.test(input);
    }

    public async getArgumentRange() {
        return null;
    }
}


export class SelectArgument {

    private range: Array<string>;
    private taskArguments;

    constructor(taskArguments) {
        this.taskArguments = taskArguments;
    }

    public static typeName() {
        return "SELECT";
    }

    public setRange(range: Array<string>) {
        this.range = range;
    }

    async validateInput(argumentName, input): Promise<boolean> {



        return true;
    }

    public async getArgumentRange() {

        return this.range;
    }
}

/**
 * @param name The name of the advancedTaskDefinition type (stored in field)
 */
export const advancedTaskDefinitionTypeFactory = (sqlClientPool, taskArguments, environment) => (taskTypeName) => {
    switch (taskTypeName) {
        case (EnvironmentSourceArgument.typeName()):
            return new EnvironmentSourceArgument(sqlClientPool, environment);
            break;
        case (StringArgument.typeName()):
            return new StringArgument();
            break;
        case (NumberArgument.typeName()):
            return new NumberArgument();
            break;
        case (OtherEnvironmentSourceNamesArgument.typeName()):
            return new OtherEnvironmentSourceNamesArgument(sqlClientPool, environment);
            break;
        case (SelectArgument.typeName()):
            return new SelectArgument(taskArguments);
        default:
            throw new Error(`Unable to find AdvancedTaskDefinitionType ${taskTypeName}`);
            break;
    }
}
