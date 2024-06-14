import { IAM } from '@aws-sdk/client-iam';
import { STS } from '@aws-sdk/client-sts';
import { AWSConfig } from './config';
import { showSpinner } from './logger';

export async function getAccountAlias(awsConfig: AWSConfig): Promise<string> {
  showSpinner('Getting account alias');

  const iam = new IAM(awsConfig);

  const accountAliases = await iam.listAccountAliases();
  const foundAlias = accountAliases?.['AccountAliases']?.[0];

  if (foundAlias) {
    return foundAlias;
  }

  const sts = new STS(awsConfig);

  const accountInfo = await sts.getCallerIdentity();

  return accountInfo?.Account || '';
}
