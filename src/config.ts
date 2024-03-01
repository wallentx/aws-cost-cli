import fs from 'node:fs';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import chalk from 'chalk';
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
  targetAccount: string;
};

export async function getAwsConfigFromOptionsOrFile(options: {
  profile: string;
  accessKey: string;
  secretKey;
  sessionToken;
  region: string;
  roleArn?: string;
  targetAccount?: string;
}): Promise<AWSConfig> {
  const { profile, accessKey, secretKey, sessionToken, region, roleArn, targetAccount } = options;

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
        sessionToken: sessionToken
      },
      region: region,
    };
  }

  return {
    credentials: await loadAwsCredentials(profile, region, roleArn),
    region: region,
    targetAccount: targetAccount,
  };
}

/**
 * Loads the environment variables from the .env file
 * @param path Path to the .env file
 */
async function loadAwsCredentials(profile: string = 'default', region: string, roleArn = ''): Promise<AWSConfig['credentials'] | undefined> {
  const configFiles = await loadSharedConfigFiles();

  const credentialsFile = configFiles.credentialsFile;

  const accessKey: string = credentialsFile?.[profile]?.aws_access_key_id;
  const secretKey: string = credentialsFile?.[profile]?.aws_secret_access_key;
  const sessionToken: string = credentialsFile?.[profile]?.aws_session_token;

  // Fixing the region to us-east-1 since Cost Explorer only supports this region
  // https://docs.aws.amazon.com/general/latest/gr/billing.html#billing-cur
  // https://github.com/kamranahmedse/aws-cost-cli/issues/1
  // const configFile = configFiles.configFile;
  // const region: string = configFile?.[profile]?.region;
  if (accessKey && secretKey) {
    return {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      sessionToken: sessionToken,
    };
  } else {
    try {
      const stsClient = new STSClient({ region: region });
      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "aws-cost-cli",
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
      console.error("Error fetching temporary credentials:", error);
    }

    const sharedCredentialsFile = process.env.AWS_SHARED_CREDENTIALS_FILE || '~/.aws/credentials';
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
    ${chalk.bold(`--target-account`)}
    `);
  }
}
