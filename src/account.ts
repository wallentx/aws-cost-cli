import {
  OrganizationsClient,
  DescribeAccountCommand,
} from '@aws-sdk/client-organizations';
import AWS from 'aws-sdk';
import { AWSConfig } from './config';
import { showSpinner } from './logger';

export async function getAccountAlias(awsConfig: AWSConfig): Promise<string> {
  showSpinner('Getting account alias');

  if (awsConfig.targetAccount) {
    const organizations = new OrganizationsClient({
      region: 'us-east-1', // Organizations API is only available in us-east-1
      credentials: {
        accessKeyId: awsConfig.credentials.accessKeyId,
        secretAccessKey: awsConfig.credentials.secretAccessKey,
        sessionToken: awsConfig.credentials.sessionToken,
      },
    });
    const command = new DescribeAccountCommand({
      AccountId: awsConfig.targetAccount,
    });
    const accountInfo = await organizations.send(command);
    return accountInfo.Account?.Name || awsConfig.targetAccount;
  }

  const iam = new AWS.IAM(awsConfig);

  const accountAliases = await iam.listAccountAliases().promise();
  const foundAlias = accountAliases?.AccountAliases?.[0];

  if (foundAlias) {
    return foundAlias;
  }

  const sts = new AWS.STS(awsConfig);

  const accountInfo = await sts.getCallerIdentity().promise();

  return accountInfo?.Account || '';
}
