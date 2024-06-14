import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { printFatalError } from './logger';

export type EnvConfig = {
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
};

export type AWSConfig = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  region: string;
};

export async function getAwsConfigFromOptionsOrFile(options: {
  profile: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  region: string;
  roleArn?: string;
}): Promise<AWSConfig> {
  const { profile, accessKey, secretKey, sessionToken, region, roleArn } = options;

  if (accessKey || secretKey) {
    if (!accessKey || !secretKey) {
      printFatalError(`
      You need to provide both of the following options: 
        ${chalk.bold('--access-key')}
        ${chalk.bold('--secret-key')}
      `);
    }

    return {
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        sessionToken: sessionToken,
      },
      region: region,
    };
  }

  return {
    credentials: await loadAwsCredentials(profile, region, roleArn),
    region: region,
  };
}

async function loadAwsCredentials(
  profile: string = 'default',
  region: string,
  roleArn: string = '',
): Promise<AWSConfig['credentials'] | undefined> {
  const configFiles = await loadSharedConfigFiles();

  const credentialsFile = configFiles.credentialsFile;

  const accessKey: string = credentialsFile?.[profile]?.aws_access_key_id;
  const secretKey: string = credentialsFile?.[profile]?.aws_secret_access_key;
  const sessionToken: string = credentialsFile?.[profile]?.aws_session_token;

  if (accessKey && secretKey) {
    return {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      sessionToken: sessionToken,
    };
  } else if (isSsoProfile(configFiles, profile)) {
    return await getSsoCredentials(profile);
  } else if (roleArn) {
    try {
      const stsClient = new STSClient({ region: region });
      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: 'aws-cost-cli',
      });

      const { Credentials } = await stsClient.send(assumeRoleCommand);

      if (Credentials) {
        return {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken,
        };
      }
    } catch (error) {
      if (error.Code === 'AccessDenied') {
        console.warn(`AccessDenied error when assuming role: ${roleArn}. Continuing with SSO credentials.`);
      } else {
        console.error('Error fetching temporary credentials:', error);
      }
    }
  } else {
    const sharedCredentialsFile =
      process.env.AWS_SHARED_CREDENTIALS_FILE || '~/.aws/credentials';
    const sharedConfigFile = process.env.AWS_CONFIG_FILE || '~/.aws/config';

    printFatalError(`
    Could not find the AWS credentials in the following files for the profile "${profile}":
    ${chalk.bold(sharedCredentialsFile)}
    ${chalk.bold(sharedConfigFile)}

    If the config files exist at different locations, set the following environment variables:
    ${chalk.bold(`AWS_SHARED_CREDENTIALS_FILE`)}
    ${chalk.bold(`AWS_CONFIG_FILE`)}

    You can also configure the credentials via the following command:
    ${chalk.bold(`aws configure --profile ${profile}`)}

    You can also provide the credentials via the following options:
    ${chalk.bold(`--access-key`)}
    ${chalk.bold(`--secret-key`)}
    ${chalk.bold(`--region`)}
    ${chalk.bold(`--role-arn`)}
    `);
  }
}

async function getSsoCredentials(profile: string): Promise<AWSConfig['credentials']> {
  const configFiles = await loadSharedConfigFiles();
  const configFile = configFiles.configFile;

  const ssoStartUrl = configFile?.[profile]?.sso_start_url;
  const ssoRegion = configFile?.[profile]?.sso_region;
  const ssoAccountId = configFile?.[profile]?.sso_account_id;
  const ssoRoleName = configFile?.[profile]?.sso_role_name;
  const ssoSession = configFile?.[profile]?.sso_session;

  if (!ssoStartUrl || !ssoRegion || !ssoAccountId || !ssoRoleName || !ssoSession) {
    throw new Error('Missing SSO configuration for the profile');
  }

  const ssoClient = new SSOClient({ region: ssoRegion });

  const ssoTokenPath = path.join(os.homedir(), '.aws', 'sso', 'cache', `${ssoSession}.json`);
  const ssoTokenContent = fs.readFileSync(ssoTokenPath).toString();
  const ssoToken = JSON.parse(ssoTokenContent);

  const params = {
    accountId: ssoAccountId,
    roleName: ssoRoleName,
    accessToken: ssoToken.accessToken,
  };

  const command = new GetRoleCredentialsCommand(params);
  const response = await ssoClient.send(command);

  if (response.roleCredentials) {
    return {
      accessKeyId: response.roleCredentials.accessKeyId,
      secretAccessKey: response.roleCredentials.secretAccessKey,
      sessionToken: response.roleCredentials.sessionToken,
    };
  } else {
    throw new Error('Unable to fetch SSO credentials');
  }
}

function isSsoProfile(configFiles: any, profile: string): boolean {
  const configFile = configFiles.configFile;
  return (
    configFile?.[profile]?.sso_start_url &&
    configFile?.[profile]?.sso_region &&
    configFile?.[profile]?.sso_account_id &&
    configFile?.[profile]?.sso_role_name &&
    configFile?.[profile]?.sso_session
  );
}
