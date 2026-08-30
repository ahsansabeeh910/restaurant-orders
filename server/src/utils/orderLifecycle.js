// Valid status transitions
const VALID_TRANSITIONS = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [],
  CANCELLED: [],
};

export const canTransition = (currentStatus, newStatus) => {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

export const getTransitionError = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) {
    return `Order is already ${currentStatus}.`;
  }
  if (newStatus === 'CANCELLED' && ['PREPARING', 'READY', 'SERVED'].includes(currentStatus)) {
    return `Cannot cancel an order that is already ${currentStatus}. Orders can only be cancelled while Placed or Accepted.`;
  }
  if (['SERVED', 'CANCELLED'].includes(currentStatus)) {
    return `Cannot change status of an order that is ${currentStatus}. This order is closed.`;
  }
  const validNext = VALID_TRANSITIONS[currentStatus];
  if (validNext && validNext.length > 0) {
    return `Cannot move from ${currentStatus} to ${newStatus}. Valid transitions: ${validNext.join(', ')}.`;
  }
  return `Invalid status transition from ${currentStatus} to ${newStatus}.`;
};

export const canAddLines = (status) => {
  return !['SERVED', 'CANCELLED'].includes(status);
};

export const canVoidLine = (status) => {
  return !['SERVED', 'CANCELLED'].includes(status);
};
