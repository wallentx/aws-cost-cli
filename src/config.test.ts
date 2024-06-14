import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { fromSSO } from '@aws-sdk/credential-providers';
import { mockClient } from 'aws-sdk-client-mock';
import { getAwsConfigFromOptionsOrFile } from './config';

const stsMock = mockClient(STSClient);

describe('getAwsConfigFromOptionsOrFile', () => {
  afterEach(() => {
    stsMock.reset();
  });

  it('should assume role if roleArn is provided', async () => {
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: 'mockAccessKeyId',
        SecretAccessKey: 'mockSecretAccessKey',
        SessionToken: 'mockSessionToken',
        Expiration: new Date(Date.now() + 3600000), // 1 hour from now
      },
    });

    const awsConfig = await getAwsConfigFromOptionsOrFile({
      profile: 'default',
      accessKey: '',
      secretKey: '',
      sessionToken: '',
      region: 'us-east-1',
      roleArn: 'arn:aws:iam::123456789012:role/mockRole',
    });

    expect(awsConfig.credentials.accessKeyId).toBe('mockAccessKeyId');
    expect(awsConfig.credentials.secretAccessKey).toBe('mockSecretAccessKey');
    expect(awsConfig.credentials.sessionToken).toBe('mockSessionToken');
  });

  it('should fetch SSO credentials if profile uses SSO', async () => {
    const ssoProvider = fromSSO({ profile: 'default' });
    const credentials = await ssoProvider();
    expect(credentials).toHaveProperty('accessKeyId');
    expect(credentials).toHaveProperty('secretAccessKey');
    expect(credentials).toHaveProperty('sessionToken');
  });
});
