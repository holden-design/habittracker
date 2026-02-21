/**
 * Notification utilities for habit reminders
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendHabitNotification = async (habitName: string, scheduledTime: string) => {
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    new Notification('Habit Added', {
      body: `${habitName} scheduled for ${scheduledTime}`,
      icon: '📋',
      requireInteraction: false,
    });
  }
};

export const sendReminderNotification = (habitName: string, status: string) => {
  if (Notification.permission === 'granted') {
    new Notification('Habit Reminder', {
      body: `Don't forget: ${habitName} (${status})`,
      icon: '🔔',
      requireInteraction: true,
    });
  }
};

export const sendCompletionNotification = (habitName: string) => {
  if (Notification.permission === 'granted') {
    new Notification('Great job! 🎉', {
      body: `You completed ${habitName}!`,
      icon: '✅',
      requireInteraction: false,
    });
  }
};
