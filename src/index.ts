import { Command } from 'commander';
import { getAwsConfigFromOptionsOrFile } from './config';
import { getAccountAlias } from './account';
import { getTotalCosts } from './cost';
import { printJson } from './printers/json';
import { printPlainText } from './printers/text';
import { printFancy } from './printers/fancy';
import { notifySlack } from './printers/slack';

const program = new Command();

program
  .version('0.2.6')
  .name('aws-cost')
  .description('A CLI tool to perform cost analysis on your AWS account')
  .option('-p, --profile [profile]', 'AWS profile to use', 'default')
  .option('-k, --access-key [key]', 'AWS access key')
  .option('-s, --secret-key [key]', 'AWS secret key')
  .option('-t, --session-Token [key]', 'AWS session Token')
  .option('-r, --region [region]', 'AWS region', 'us-east-1')
  .option('--role-arn [arn]', 'ARN of IAM role')
  .option('-j, --json', 'Get the output as JSON')
  .option('-u, --summary', 'Get only the summary without service breakdown')
  .option('-t, --text', 'Get the output as plain text (no colors / tables)')
  .option('-S, --slack-token [token]', 'Token for the slack integration')
  .option(
    '-C, --slack-channel [channel]',
    'Channel to which the slack integration should post'
  )
  .option('-v, --version', 'Get the version of the CLI')
  .option('-h, --help', 'Get the help of the CLI')
  .parse(process.argv);

const options = program.opts();

if (options.help) {
  program.help();
  process.exit(0);
}

async function main() {
  try {
    const awsConfig = await getAwsConfigFromOptionsOrFile({
      profile: options.profile,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      sessionToken: options.sessionToken,
      region: options.region,
      roleArn: options.roleArn,
    });

    const alias = await getAccountAlias(awsConfig);
    const costs = await getTotalCosts(awsConfig);

    if (options.json) {
      printJson(alias, costs, options.summary);
    } else if (options.text) {
      printPlainText(alias, costs, options.summary);
    } else {
      printFancy(alias, costs, options.summary);
    }

    if (options.slackToken && options.slackChannel) {
      await notifySlack(
        alias,
        costs,
        options.summary,
        options.slackToken,
        options.slackChannel
      );
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
