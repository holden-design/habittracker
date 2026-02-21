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

export const sendMissedHabitNotification = async (habitName: string, scheduledTime: string) => {
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    new Notification('⏰ Missed Habit Reminder', {
      body: `${habitName} was scheduled for ${scheduledTime}. Don't forget to complete it!`,
      icon: '⏰',
      requireInteraction: true,
      tag: `missed-${habitName}`,
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
