# How to Implement Delayed Jobs with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Delayed Jobs, Job Scheduling, Background Jobs

Description: A comprehensive guide to implementing delayed jobs with BullMQ, including scheduling jobs for future execution, managing delays dynamically, and building practical scheduling patterns for notifications and reminders.

---

Delayed jobs are a powerful feature in BullMQ that allow you to schedule jobs to be processed at a specific time in the future. This is essential for features like scheduled notifications, reminder systems, subscription renewals, and time-based workflows. This guide covers everything you need to know about implementing delayed jobs effectively.

## Understanding Delayed Jobs

Delayed jobs in BullMQ are stored in Redis sorted sets until their scheduled time arrives. The delay is specified in milliseconds from the time the job is added to the queue.

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('notifications', { connection });

// Add a job with a 5-minute delay
await queue.add(
  'send-reminder',
  { userId: '123', message: 'Your appointment is tomorrow' },
  { delay: 5 * 60 * 1000 } // 5 minutes in milliseconds
);
```

## Basic Delayed Job Patterns

### Fixed Delay

Schedule a job to run after a specific duration:

```typescript
interface ReminderJobData {
  userId: string;
  type: 'email' | 'push' | 'sms';
  message: string;
  metadata?: Record<string, unknown>;
}

class NotificationScheduler {
  constructor(private queue: Queue<ReminderJobData>) {}

  // Send notification after a fixed delay
  async scheduleReminder(
    data: ReminderJobData,
    delayMinutes: number
  ) {
    const job = await this.queue.add('reminder', data, {
      delay: delayMinutes * 60 * 1000,
    });
    console.log(`Scheduled reminder ${job.id} for ${delayMinutes} minutes`);
    return job;
  }

  // Send notification in 1 hour
  async scheduleHourlyReminder(data: ReminderJobData) {
    return this.scheduleReminder(data, 60);
  }

  // Send notification in 24 hours
  async scheduleDailyReminder(data: ReminderJobData) {
    return this.scheduleReminder(data, 24 * 60);
  }
}
```

### Scheduled at Specific Time

Schedule a job to run at a specific date and time:

```typescript
class ScheduledNotificationService {
  constructor(private queue: Queue) {}

  // Schedule for a specific date/time
  async scheduleAt(data: ReminderJobData, scheduledTime: Date) {
    const now = Date.now();
    const delay = scheduledTime.getTime() - now;

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const job = await this.queue.add('scheduled-notification', data, {
      delay,
      // Store the original scheduled time in job data for reference
      jobId: `notification_${data.userId}_${scheduledTime.getTime()}`,
    });

    console.log(`Scheduled notification for ${scheduledTime.toISOString()}`);
    return job;
  }

  // Schedule for tomorrow at 9 AM
  async scheduleForTomorrowMorning(data: ReminderJobData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return this.scheduleAt(data, tomorrow);
  }

  // Schedule for next Monday at 10 AM
  async scheduleForNextMonday(data: ReminderJobData) {
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(10, 0, 0, 0);
    return this.scheduleAt(data, nextMonday);
  }
}
```

## Working with Time Zones

Handle time zones properly when scheduling jobs:

```typescript
import { format, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

interface TimezoneAwareJobData {
  userId: string;
  message: string;
  userTimezone: string;
}

class TimezoneAwareScheduler {
  constructor(private queue: Queue<TimezoneAwareJobData>) {}

  // Schedule at a specific time in the user's timezone
  async scheduleInUserTimezone(
    data: TimezoneAwareJobData,
    localTime: { hour: number; minute: number },
    daysFromNow: number = 0
  ) {
    const { userTimezone } = data;

    // Create the target time in user's timezone
    const now = new Date();
    const userNow = utcToZonedTime(now, userTimezone);

    const targetDate = new Date(userNow);
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    targetDate.setHours(localTime.hour, localTime.minute, 0, 0);

    // Convert back to UTC for accurate delay calculation
    const utcTargetDate = zonedTimeToUtc(targetDate, userTimezone);
    const delay = utcTargetDate.getTime() - now.getTime();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    return this.queue.add('timezone-notification', data, {
      delay,
      jobId: `tz_notification_${data.userId}_${utcTargetDate.getTime()}`,
    });
  }

  // Schedule morning notification at 9 AM user's local time
  async scheduleMorningNotification(data: TimezoneAwareJobData) {
    return this.scheduleInUserTimezone(data, { hour: 9, minute: 0 }, 1);
  }
}

// Usage
const scheduler = new TimezoneAwareScheduler(queue);
await scheduler.scheduleMorningNotification({
  userId: 'user123',
  message: 'Good morning! Here is your daily summary.',
  userTimezone: 'America/New_York',
});
```

## Managing Delayed Jobs

### Checking Job Delay Status

```typescript
async function getDelayedJobInfo(queue: Queue, jobId: string) {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const now = Date.now();

  if (state === 'delayed') {
    const delayedUntil = job.timestamp + (job.opts.delay || 0);
    return {
      id: job.id,
      state,
      scheduledFor: new Date(delayedUntil).toISOString(),
      timeRemaining: delayedUntil - now,
      data: job.data,
    };
  }

  return {
    id: job.id,
    state,
    data: job.data,
  };
}

// Get all delayed jobs
async function getAllDelayedJobs(queue: Queue) {
  const delayedJobs = await queue.getDelayed();
  return delayedJobs.map(job => ({
    id: job.id,
    scheduledFor: new Date(job.timestamp + (job.opts.delay || 0)).toISOString(),
    data: job.data,
  }));
}
```

### Modifying Delayed Jobs

Change the delay of an existing job:

```typescript
async function changeJobDelay(
  queue: Queue,
  jobId: string,
  newDelay: number
) {
  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();
  if (state !== 'delayed') {
    throw new Error(`Cannot change delay of job in ${state} state`);
  }

  // BullMQ allows changing delay using changeDelay
  await job.changeDelay(newDelay);
  console.log(`Changed delay for job ${jobId} to ${newDelay}ms`);
}

async function rescheduleJob(
  queue: Queue,
  jobId: string,
  newScheduledTime: Date
) {
  const now = Date.now();
  const newDelay = newScheduledTime.getTime() - now;

  if (newDelay <= 0) {
    throw new Error('New scheduled time must be in the future');
  }

  await changeJobDelay(queue, jobId, newDelay);
}
```

### Canceling Delayed Jobs

```typescript
async function cancelDelayedJob(queue: Queue, jobId: string) {
  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();
  if (state !== 'delayed') {
    throw new Error(`Cannot cancel job in ${state} state`);
  }

  await job.remove();
  console.log(`Canceled delayed job ${jobId}`);
}

// Cancel all delayed jobs for a user
async function cancelUserDelayedJobs(queue: Queue, userId: string) {
  const delayedJobs = await queue.getDelayed();
  const userJobs = delayedJobs.filter(job => job.data.userId === userId);

  await Promise.all(userJobs.map(job => job.remove()));
  console.log(`Canceled ${userJobs.length} delayed jobs for user ${userId}`);
}
```

## Practical Examples

### Appointment Reminder System

```typescript
interface AppointmentData {
  appointmentId: string;
  userId: string;
  userEmail: string;
  appointmentTime: string; // ISO string
  doctorName: string;
  location: string;
}

class AppointmentReminderService {
  private queue: Queue<AppointmentData>;

  constructor(connection: Redis) {
    this.queue = new Queue('appointment-reminders', { connection });
  }

  async scheduleReminders(appointment: AppointmentData) {
    const appointmentTime = new Date(appointment.appointmentTime);
    const now = Date.now();

    // Schedule 24-hour reminder
    const reminder24h = appointmentTime.getTime() - 24 * 60 * 60 * 1000;
    if (reminder24h > now) {
      await this.queue.add(
        'reminder-24h',
        appointment,
        {
          delay: reminder24h - now,
          jobId: `reminder_24h_${appointment.appointmentId}`,
        }
      );
    }

    // Schedule 2-hour reminder
    const reminder2h = appointmentTime.getTime() - 2 * 60 * 60 * 1000;
    if (reminder2h > now) {
      await this.queue.add(
        'reminder-2h',
        appointment,
        {
          delay: reminder2h - now,
          jobId: `reminder_2h_${appointment.appointmentId}`,
        }
      );
    }

    // Schedule 30-minute reminder
    const reminder30m = appointmentTime.getTime() - 30 * 60 * 1000;
    if (reminder30m > now) {
      await this.queue.add(
        'reminder-30m',
        appointment,
        {
          delay: reminder30m - now,
          jobId: `reminder_30m_${appointment.appointmentId}`,
        }
      );
    }

    console.log(`Scheduled reminders for appointment ${appointment.appointmentId}`);
  }

  async cancelReminders(appointmentId: string) {
    const reminderTypes = ['24h', '2h', '30m'];

    await Promise.all(
      reminderTypes.map(async (type) => {
        const jobId = `reminder_${type}_${appointmentId}`;
        const job = await this.queue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      })
    );

    console.log(`Canceled all reminders for appointment ${appointmentId}`);
  }

  async rescheduleReminders(
    appointmentId: string,
    newAppointmentTime: Date
  ) {
    await this.cancelReminders(appointmentId);

    // Get appointment data from one of the old jobs or database
    // Then reschedule with new time
    // This is a simplified example
  }
}

// Worker to process reminders
const reminderWorker = new Worker<AppointmentData>(
  'appointment-reminders',
  async (job) => {
    const { data, name } = job;

    switch (name) {
      case 'reminder-24h':
        await sendEmail({
          to: data.userEmail,
          subject: 'Appointment Tomorrow',
          body: `Reminder: You have an appointment with ${data.doctorName} tomorrow at ${data.location}.`,
        });
        break;
      case 'reminder-2h':
        await sendPushNotification({
          userId: data.userId,
          title: 'Appointment in 2 hours',
          body: `Your appointment with ${data.doctorName} is in 2 hours.`,
        });
        break;
      case 'reminder-30m':
        await sendSMS({
          userId: data.userId,
          message: `Your appointment with ${data.doctorName} starts in 30 minutes at ${data.location}.`,
        });
        break;
    }
  },
  { connection }
);
```

### Trial Expiration System

```typescript
interface TrialData {
  userId: string;
  email: string;
  trialStartDate: string;
  trialEndDate: string;
  plan: string;
}

class TrialExpirationService {
  private queue: Queue<TrialData>;

  constructor(connection: Redis) {
    this.queue = new Queue('trial-notifications', { connection });
  }

  async scheduleTrialNotifications(trial: TrialData) {
    const trialEnd = new Date(trial.trialEndDate);
    const now = Date.now();

    // 7 days before expiration
    const notify7Days = trialEnd.getTime() - 7 * 24 * 60 * 60 * 1000;
    if (notify7Days > now) {
      await this.queue.add('trial-expiring-7d', trial, {
        delay: notify7Days - now,
        jobId: `trial_7d_${trial.userId}`,
      });
    }

    // 3 days before expiration
    const notify3Days = trialEnd.getTime() - 3 * 24 * 60 * 60 * 1000;
    if (notify3Days > now) {
      await this.queue.add('trial-expiring-3d', trial, {
        delay: notify3Days - now,
        jobId: `trial_3d_${trial.userId}`,
      });
    }

    // 1 day before expiration
    const notify1Day = trialEnd.getTime() - 24 * 60 * 60 * 1000;
    if (notify1Day > now) {
      await this.queue.add('trial-expiring-1d', trial, {
        delay: notify1Day - now,
        jobId: `trial_1d_${trial.userId}`,
      });
    }

    // On expiration
    await this.queue.add('trial-expired', trial, {
      delay: trialEnd.getTime() - now,
      jobId: `trial_expired_${trial.userId}`,
    });

    console.log(`Scheduled trial notifications for user ${trial.userId}`);
  }

  async extendTrial(userId: string, newEndDate: Date) {
    // Cancel existing notifications
    const jobTypes = ['7d', '3d', '1d', 'expired'];
    await Promise.all(
      jobTypes.map(async (type) => {
        const jobId = `trial_${type}_${userId}`;
        const job = await this.queue.getJob(jobId);
        if (job) await job.remove();
      })
    );

    // Reschedule with new end date
    // Fetch user data and call scheduleTrialNotifications
  }
}
```

### Scheduled Report Generation

```typescript
interface ReportJobData {
  reportId: string;
  userId: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  email: string;
  filters: Record<string, unknown>;
}

class ReportScheduler {
  private queue: Queue<ReportJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('report-generation', { connection });
  }

  async scheduleReport(data: ReportJobData, scheduledTime: Date) {
    const delay = scheduledTime.getTime() - Date.now();

    if (delay <= 0) {
      // If time has passed, run immediately
      return this.queue.add('generate-report', data);
    }

    return this.queue.add('generate-report', data, {
      delay,
      jobId: `report_${data.reportId}`,
    });
  }

  // Schedule report for end of day (11 PM)
  async scheduleEndOfDayReport(data: ReportJobData) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 0, 0, 0);

    // If it's already past 11 PM, schedule for tomorrow
    if (endOfDay.getTime() <= Date.now()) {
      endOfDay.setDate(endOfDay.getDate() + 1);
    }

    return this.scheduleReport(data, endOfDay);
  }

  // Schedule report for end of week (Sunday 11 PM)
  async scheduleWeeklyReport(data: ReportJobData) {
    const today = new Date();
    const daysUntilSunday = 7 - today.getDay();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 0, 0, 0);

    return this.scheduleReport(data, endOfWeek);
  }
}
```

## Best Practices

1. **Use unique job IDs** - Prevent duplicate scheduling by using consistent job IDs based on the entity and notification type.

2. **Validate delays** - Always check that the delay is positive before scheduling.

3. **Store original schedule time** - Include the intended execution time in job data for debugging.

4. **Handle timezone properly** - Convert user timezones to UTC for accurate delay calculation.

5. **Plan for cancellation** - Design your job IDs to make it easy to find and cancel related jobs.

6. **Set reasonable maximums** - Avoid scheduling jobs too far in the future (Redis memory considerations).

7. **Monitor delayed job counts** - Track how many jobs are in the delayed state.

8. **Test with time manipulation** - Use libraries like sinon or jest to test time-dependent logic.

## Conclusion

Delayed jobs in BullMQ provide a powerful way to schedule future tasks. Whether you're building reminder systems, trial notifications, or scheduled reports, understanding how to properly create, manage, and cancel delayed jobs is essential. By following the patterns in this guide, you can build robust scheduling features that handle edge cases like time zones, rescheduling, and cancellation gracefully.
