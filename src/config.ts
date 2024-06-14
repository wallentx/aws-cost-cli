import { fromIni } from '@aws-sdk/credential-providers';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
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
};

export async function getAwsConfigFromOptionsOrFile(options: {
  profile: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  region: string;
  roleArn?: string;
}): Promise<AWSConfig> {
  const { profile, accessKey, secretKey, sessionToken, region, roleArn } =
    options;

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
  try {
    if (roleArn) {
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
    }

    // Fallback to default credential provider chain
    const provider = fromIni({ profile });
    const credentials = await provider();
    return {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    };
  } catch (error) {
    console.error('Error fetching credentials:', error);
    throw error;
  }
}
