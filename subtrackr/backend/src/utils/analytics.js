const getMonthlyCost = (sub) => {
  if (sub.billing_cycle === 'yearly')  return sub.cost / 12;
  if (sub.billing_cycle === 'weekly')  return sub.cost * 4.33;
  return sub.cost;
};

module.exports = { getMonthlyCost };
