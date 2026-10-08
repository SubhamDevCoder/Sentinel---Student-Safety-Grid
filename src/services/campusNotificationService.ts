import { SosAlertDocument } from '../types.ts';
import { soundManager } from '../utils/audio.ts';

export function getNotificationPermission(): NotificationPermission {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      soundManager.playSuccessChime();
    }
    return permission;
  } catch (err) {
    console.warn('[Notification] Permission request warning:', err);
    return Notification.permission;
  }
}

/**
 * Triggers a native system push notification on the device
 * when an emergency SOS alert is received.
 * Operates completely silently without loud audio sirens.
 */
export async function triggerCampusWideSosNotification(alert: SosAlertDocument): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const title = `🚨 EMERGENCY SOS: ${alert.user_name || 'GCEK Student'}`;
  const locStr = alert.campus_location || `${alert.location?.latitude?.toFixed(4)}, ${alert.location?.longitude?.toFixed(4)}`;
  const phoneStr = alert.phone_number ? ` • Call: ${alert.phone_number}` : '';
  const body = `CRITICAL ALERT: ${alert.issue || 'Emergency'}\nLocation: ${locStr}${phoneStr}\nTap to open Sentinel Safety Grid.`;

  const notificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `gcek-sos-${alert.sos_id}`,
    requireInteraction: true,
    // Vibration pattern: 300ms buzz, 150ms pause, 300ms buzz, 150ms pause, 600ms buzz
    vibrate: [300, 150, 300, 150, 600],
    data: {
      sos_id: alert.sos_id,
      phone_number: alert.phone_number,
      url: window.location.href,
    },
  } as unknown as NotificationOptions;

  try {
    // If Service Worker registration is active, prefer showNotification for rich background presentation
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }

    // Standard Notification fallback
    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('[Notification Dispatch Warning]:', err);
  }
}
