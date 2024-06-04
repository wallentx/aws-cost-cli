import fetch from 'node-fetch';
import { TotalCosts } from '../cost';

/**
 * Formats the costs by service into a string
 *
 * @param costs Cost breakdown for account
 * @returns formatted message
 */
function formatServiceBreakdown(costs: TotalCosts, period: string): string {
  const validPeriods = ['yesterday', 'last7Days', 'thisMonth', 'lastMonth'];

  if (!validPeriods.includes(period)) {
    throw new Error(
      '"period" must be one of "yesterday", "thisMonth", or "lastMonth"',
    );
  }

  const serviceCosts = costs.totalsByService[period];

  const sortedServices = Object.keys(serviceCosts)
    .filter((service) => serviceCosts[service] > 0)
    .sort((a, b) => serviceCosts[b] - serviceCosts[a]);

  const serviceCostsFormatted = sortedServices.map((service) => {
    return `> ${service}: \`$${serviceCosts[service].toFixed(2)}\``;
  });

  return serviceCostsFormatted.join('\n');
}

export async function notifySlack(
  accountAlias: string,
  costs: TotalCosts,
  isSummary: boolean,
  slackToken: string,
  slackChannel: string,
  period: string = 'yesterday',
) {
  const channel = slackChannel;

  const totals = costs.totals;
  const serviceCosts = costs.totalsByService;

  const serviceCostsYesterday = [];
  Object.keys(serviceCosts.yesterday).forEach((service) => {
    serviceCosts.yesterday[service].toFixed(2);
    serviceCostsYesterday.push(
      `${service}: $${serviceCosts.yesterday[service].toFixed(2)}`,
    );
  });

  const summary = `> *Account: ${accountAlias}*

> *Summary *
> Total Yesterday: \`$${totals.yesterday.toFixed(2)}\`
> Total This Month: \`$${totals.thisMonth.toFixed(2)}\`
> Total Last Month: \`$${totals.lastMonth.toFixed(2)}\`
`;

  const breakdown = `
> *Breakdown by Service:*
${formatServiceBreakdown(costs, period)}
`;

  let message = `${summary}`;
  if (!isSummary) {
    message += `${breakdown}`;
  }

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    body: JSON.stringify({
      channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ],
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${slackToken}`,
    },
  });
}

if (process.env.NODE_ENV === 'test') {
  Object.assign(module.exports, {
    formatServiceBreakdown,
  });
}
