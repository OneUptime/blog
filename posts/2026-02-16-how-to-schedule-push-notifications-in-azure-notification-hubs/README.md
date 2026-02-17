# How to Schedule Push Notifications in Azure Notification Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Scheduled Notifications, Push, Mobile, Automation, Cloud

Description: Learn how to schedule push notifications in Azure Notification Hubs for future delivery, including time zone handling and cancellation.

---

Sometimes you need a notification to go out at a specific time. A reminder for an upcoming meeting, a promotional message timed for peak engagement hours, or a maintenance notification that should arrive 30 minutes before downtime. Instead of building your own scheduling system with timers and cron jobs, Azure Notification Hubs has built-in support for scheduled notifications.

In this post, I will show you how to schedule notifications for future delivery, handle time zones, cancel scheduled notifications, and build patterns for recurring notification schedules.

## How Scheduled Notifications Work

When you schedule a notification, you provide the notification payload and a delivery time. Azure Notification Hubs stores the notification and delivers it at the specified time. The scheduling is handled server-side, so your application does not need to be running when the notification fires.

A few things to know upfront:

- Scheduled notifications require the **Standard tier**. The Free and Basic tiers do not support scheduling.
- The scheduled time is in UTC. You need to convert from local time zones yourself.
- You can schedule up to 7 days in advance.
- You can cancel a scheduled notification before it fires.

## Scheduling a Basic Notification

Here is how to schedule a notification for a specific time.

```javascript
// schedule-basic.js - Schedule a notification for future delivery
const { NotificationHubsClient } = require('@azure/notification-hubs');

const connectionString = process.env.NOTIFICATION_HUB_CONNECTION_STRING;
const client = new NotificationHubsClient(connectionString, 'my-hub');

async function scheduleNotification(title, body, scheduledTimeUtc, tagExpression) {
  // Create the notification payload
  const notification = {
    body: JSON.stringify({
      notification: {
        title: title,
        body: body
      }
    })
  };

  // Schedule the notification for a specific UTC time
  const result = await client.scheduleNotification(
    { kind: 'Gcm', ...notification },
    new Date(scheduledTimeUtc),
    { tagExpression: tagExpression }
  );

  console.log('Scheduled notification ID:', result.notificationId);
  console.log('Tracking ID:', result.trackingId);

  // Save the notification ID so you can cancel it later if needed
  return result.notificationId;
}

// Schedule a notification for tomorrow at 9:00 AM UTC
const tomorrow9amUtc = new Date();
tomorrow9amUtc.setUTCDate(tomorrow9amUtc.getUTCDate() + 1);
tomorrow9amUtc.setUTCHours(9, 0, 0, 0);

scheduleNotification(
  'Daily Standup Reminder',
  'Standup starts in 15 minutes',
  tomorrow9amUtc.toISOString(),
  'team:engineering'
);
```

## Handling Time Zones

The biggest challenge with scheduled notifications is dealing with time zones. Your users are probably spread across different zones, and a "9 AM notification" means a different UTC time for each zone.

```javascript
// timezone-schedule.js - Schedule notifications respecting user time zones
function localToUtc(localHour, localMinute, timezone) {
  // Create a date in the target timezone and convert to UTC
  // Using Intl.DateTimeFormat to handle DST correctly
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(localHour, localMinute, 0, 0);

  // Get the offset for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset'
  });

  // Simple offset calculation (for production, use a proper library like luxon or date-fns-tz)
  const parts = formatter.formatToParts(targetDate);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');

  console.log(`Scheduling for ${localHour}:${localMinute} in ${timezone}`);
  return targetDate;
}

// Schedule the same notification for different time zones
async function scheduleByTimezone(title, body, localHour, localMinute) {
  const timezones = {
    'America/New_York': 'tz:america-new_york',
    'America/Los_Angeles': 'tz:america-los_angeles',
    'Europe/London': 'tz:europe-london',
    'Asia/Tokyo': 'tz:asia-tokyo'
  };

  const scheduledIds = [];

  for (const [tz, tag] of Object.entries(timezones)) {
    const utcTime = localToUtc(localHour, localMinute, tz);

    const id = await scheduleNotification(title, body, utcTime.toISOString(), tag);
    scheduledIds.push({ timezone: tz, notificationId: id });
  }

  return scheduledIds;
}

// Schedule a 9 AM local time notification for each timezone group
scheduleByTimezone(
  'Good Morning',
  'Check out your daily summary',
  9, 0
);
```

For this to work, you need to tag your device registrations with timezone information. When a user registers, include a tag like `tz:america-new_york` based on their timezone.

## Canceling Scheduled Notifications

Sometimes you need to cancel a notification before it fires. Maybe the event was canceled, or the user changed their preferences.

```javascript
// cancel-notification.js - Cancel a scheduled notification
async function cancelScheduledNotification(notificationId) {
  try {
    await client.cancelScheduledNotification(notificationId);
    console.log('Canceled notification:', notificationId);
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      // Notification already fired or does not exist
      console.log('Notification not found (may have already fired)');
      return false;
    }
    throw err;
  }
}

// Cancel all scheduled notifications for a canceled event
async function cancelEventNotifications(eventId, notificationIds) {
  const results = [];

  for (const id of notificationIds) {
    const canceled = await cancelScheduledNotification(id);
    results.push({ notificationId: id, canceled });
  }

  console.log(`Canceled ${results.filter(r => r.canceled).length} of ${notificationIds.length} notifications`);
  return results;
}
```

Store the notification IDs returned by `scheduleNotification` in your database so you can cancel them later. Without the ID, there is no way to cancel a specific scheduled notification.

## Building a Notification Scheduler Service

For a production application, you probably want a service that manages scheduled notifications systematically.

```javascript
// notification-scheduler.js - A service for managing scheduled notifications
class NotificationScheduler {
  constructor(client, db) {
    this.client = client;
    this.db = db; // Your database client for persistence
  }

  // Schedule a notification and persist the metadata
  async schedule(params) {
    const { title, body, scheduledTime, tagExpression, category, referenceId } = params;

    const notification = {
      body: JSON.stringify({
        notification: { title, body }
      })
    };

    const result = await this.client.scheduleNotification(
      { kind: 'Gcm', ...notification },
      new Date(scheduledTime),
      { tagExpression }
    );

    // Save to your database for tracking and cancellation
    await this.db.insert('scheduled_notifications', {
      notificationId: result.notificationId,
      title,
      body,
      scheduledTime,
      tagExpression,
      category,
      referenceId, // e.g., the event ID or meeting ID
      status: 'scheduled',
      createdAt: new Date()
    });

    return result.notificationId;
  }

  // Cancel all notifications for a given reference
  async cancelByReference(referenceId) {
    const scheduled = await this.db.query(
      'SELECT * FROM scheduled_notifications WHERE referenceId = ? AND status = ?',
      [referenceId, 'scheduled']
    );

    for (const entry of scheduled) {
      try {
        await this.client.cancelScheduledNotification(entry.notificationId);
        await this.db.update('scheduled_notifications',
          { status: 'canceled' },
          { notificationId: entry.notificationId }
        );
      } catch (err) {
        console.error(`Failed to cancel ${entry.notificationId}:`, err.message);
      }
    }

    return scheduled.length;
  }

  // Reschedule a notification to a new time
  async reschedule(notificationId, newScheduledTime) {
    const entry = await this.db.queryOne(
      'SELECT * FROM scheduled_notifications WHERE notificationId = ?',
      [notificationId]
    );

    if (!entry) throw new Error('Notification not found');

    // Cancel the existing one
    await this.client.cancelScheduledNotification(notificationId);

    // Schedule a new one
    const newId = await this.schedule({
      ...entry,
      scheduledTime: newScheduledTime
    });

    // Update the database
    await this.db.update('scheduled_notifications',
      { status: 'rescheduled', replacedBy: newId },
      { notificationId: notificationId }
    );

    return newId;
  }
}
```

## Recurring Notifications

Azure Notification Hubs does not natively support recurring notifications. You need to handle the recurrence logic yourself. The cleanest approach is to use a scheduled job (like an Azure Function with a timer trigger) that creates the next notification in the series.

```javascript
// recurring-scheduler.js - Azure Function that schedules recurring notifications
// This runs on a timer trigger, e.g., every day at midnight UTC

const { NotificationHubsClient } = require('@azure/notification-hubs');

module.exports = async function (context, myTimer) {
  const client = new NotificationHubsClient(
    process.env.NOTIFICATION_HUB_CONNECTION_STRING,
    'my-hub'
  );

  // Load recurring notification definitions from your database
  const recurringNotifications = await loadRecurringNotifications();

  for (const recurring of recurringNotifications) {
    // Calculate the next fire time based on the recurrence pattern
    const nextFireTime = calculateNextFireTime(recurring.pattern, recurring.localTime, recurring.timezone);

    if (nextFireTime) {
      await client.scheduleNotification(
        {
          kind: 'Template',
          body: JSON.stringify({
            title: recurring.title,
            body: recurring.body
          })
        },
        nextFireTime,
        { tagExpression: recurring.tagExpression }
      );

      context.log(`Scheduled recurring notification "${recurring.title}" for ${nextFireTime.toISOString()}`);
    }
  }
};

function calculateNextFireTime(pattern, localTime, timezone) {
  // Simple daily recurrence example
  if (pattern === 'daily') {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(localTime.hour, localTime.minute, 0, 0);
    return tomorrow;
  }

  // Add more patterns as needed: weekly, monthly, etc.
  return null;
}
```

## Limitations and Workarounds

A few things to be aware of when working with scheduled notifications:

- **7-day maximum.** You cannot schedule more than 7 days in advance. For notifications further out, use a job scheduler to create them closer to the delivery time.
- **No guaranteed exact delivery time.** Notifications are delivered "at or shortly after" the scheduled time. Do not rely on second-level precision.
- **Standard tier only.** If you are on the Free or Basic tier, you need to upgrade to use scheduling.
- **No batch scheduling API.** Each notification is scheduled individually. If you need to schedule thousands at once, throttle your requests to avoid hitting rate limits.

## Wrapping Up

Scheduled notifications in Azure Notification Hubs let you deliver messages at specific times without running your own job scheduler. The key is handling time zones properly by converting local times to UTC, persisting notification IDs for cancellation, and using a systematic approach for recurring notifications. Combine scheduled sends with the tag system for targeted delivery, and you have a powerful notification scheduling system with minimal infrastructure to manage.
