export function priorityClass(priority) {
  const map = {
    Low: 'badge-low',
    Medium: 'badge-medium',
    High: 'badge-high',
    Urgent: 'badge-urgent',
  };
  return map[priority] || 'badge-medium';
}
