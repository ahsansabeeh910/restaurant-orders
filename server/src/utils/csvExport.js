export const ordersToCSV = (orders) => {
  const headers = ['Order ID', 'Table Number', 'Status', 'Primary Waiter', 'Placed At', 'Total', 'Lines'];
  const rows = orders.map(order => {
    const linesStr = order.lines.map(l => 
      `${l.menuItem.name} x${l.quantity} @${l.unitPrice}${l.isVoid ? ' (VOID)' : ''}`
    ).join('; ');
    return [
      order.id,
      order.tableNumber,
      order.status,
      order.primaryWaiter.name,
      order.placedAt.toISOString(),
      order.total,
      `"${linesStr}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};
