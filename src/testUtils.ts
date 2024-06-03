import dayjs from 'dayjs';

const generateMockedCostByService = (fixedToday: string, costDataLength: number) => {
    const fixedFirstDay = dayjs(fixedToday).subtract(costDataLength, 'day');

    const resultsByTime = [];
    for (let i = 0; i < costDataLength; i++) {
    const date = dayjs(fixedFirstDay).add(i, 'day').format('YYYY-MM-DD');
    const month = dayjs(date).month(); // 0-indexed (0 = January, 1 = February, etc.)
    let service1Cost;

    switch (month) {
      case 2: // March
        service1Cost = 0.9;
        break;
      case 3: // April
        service1Cost = 1.0; // Total cost of service1 in April will be 30.00
        break;
      case 4: // May
        service1Cost = 1.1;
        break;
      default:
        service1Cost = 0.0; // Default cost if none of the above
    }

    resultsByTime.push({
      TimePeriod: {
        Start: date,
        End: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
      },
      Groups: [
        {
          Keys: ['service1'],
          Metrics: {
            UnblendedCost: {
              Amount: String(service1Cost),
              Unit: 'USD',
            },
          },
        },
        {
          Keys: ['service2'],
          Metrics: {
            UnblendedCost: {
              Amount: String(service1Cost * 100),
              Unit: 'USD',
            },
          },
        },
      ],
    });
  }
  return { ResultsByTime: resultsByTime };
};

if (process.env.NODE_ENV === 'test') {
    module.exports = { generateMockedCostByService };
}
