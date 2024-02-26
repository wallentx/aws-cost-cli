import {
  STSClient,
  AssumeRoleCommand,
  AssumeRoleCommandOutput,
  Credentials,
} from '@aws-sdk/client-sts';
import 'aws-sdk-client-mock-jest';
import { AwsClientStub, mockClient } from 'aws-sdk-client-mock';
import { getAwsConfigFromOptionsOrFile } from './config';

let stsMock: AwsClientStub<STSClient>;

beforeEach(() => {
  stsMock = mockClient(STSClient) as AwsClientStub<STSClient>;
});

afterEach(() => {
  stsMock.restore();
});

describe('should assume role if roleArn is provided', (): void => {
  const mockCredentials: Credentials = {
    AccessKeyId: 'mockAccessKeyId',
    SecretAccessKey: 'mockSecretAccessKey',
    SessionToken: 'mockSessionToken',
    Expiration: new Date(),
  };

  it('should assume role if `roleArn` is provided', async () => {
    const roleArn = 'arn:aws:iam::123456789012:role/test-role';
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: mockCredentials,
      $metadata: {},
    } as AssumeRoleCommandOutput);

    const awsConfig = await getAwsConfigFromOptionsOrFile({
      profile: 'default',
      accessKey: '',
      secretKey: '',
      sessionToken: '',
      region: 'us-east-1',
      roleArn,
    });

    expect(stsMock).toHaveReceivedCommandWith(AssumeRoleCommand, {
      RoleArn: roleArn,
    });

    expect(awsConfig.credentials).toEqual({
      accessKeyId: mockCredentials.AccessKeyId,
      secretAccessKey: mockCredentials.SecretAccessKey,
      sessionToken: mockCredentials.SessionToken,
    });
  });

  it('should allow ABAC if `{accessKey, secretKey, sessionToken}` provided', async () => {
    const accessKey = 'testAccessKey';
    const secretKey = 'testSecretKey';
    const sessionToken = 'testSessionToken';

    const awsConfig = await getAwsConfigFromOptionsOrFile({
      profile: 'default',
      accessKey: accessKey,
      secretKey: secretKey,
      sessionToken: sessionToken,
      region: 'us-east-1',
      roleArn: '',
    });

    expect(stsMock).toHaveReceivedCommandTimes(AssumeRoleCommand, 0);

    expect(awsConfig.credentials).toEqual({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      sessionToken: sessionToken,
    });
  });
});
