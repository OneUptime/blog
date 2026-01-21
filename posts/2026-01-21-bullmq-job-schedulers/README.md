# How to Use BullMQ Job Schedulers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Job Scheduling, Cron, Task Automation, Background Jobs

Description: A comprehensive guide to advanced job scheduling patterns in BullMQ, including delayed jobs, repeatable schedules, dynamic scheduling, timezone handling, and building a complete job scheduling system.

---

Job scheduling is a core capability of BullMQ that goes beyond simple cron jobs. From delayed execution to complex recurring patterns, BullMQ provides flexible scheduling options. This guide covers advanced scheduling patterns and how to build a complete scheduling system.

## Scheduling Fundamentals

BullMQ supports three main scheduling approaches:

1. **Delayed Jobs**: Run once after a specific delay
2. **Repeatable Jobs**: Run on a recurring schedule
3. **Scheduled Jobs**: Run at a specific future time

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('scheduled-jobs', { connection });

// Delayed job - runs once after delay
await queue.add('reminder', { message: 'Follow up' }, {
  delay: 60000, // 1 minute from now
});

// Repeatable job - runs on schedule
await queue.add('daily-report', {}, {
  repeat: { pattern: '0 9 * * *' }, // Every day at 9 AM
});

// Scheduled at specific time
const futureTime = new Date('2024-12-25T10:00:00');
await queue.add('christmas-greeting', {}, {
  delay: futureTime.getTime() - Date.now(),
});
```

## Building a Job Scheduler Service

Create a comprehensive scheduling service:

```typescript
interface ScheduledJobConfig {
  name: string;
  data: any;
  schedule: {
    type: 'once' | 'recurring' | 'cron';
    // For 'once': scheduledTime or delay
    scheduledTime?: Date;
    delay?: number;
    // For 'recurring': interval
    interval?: number;
    // For 'cron': pattern and timezone
    pattern?: string;
    timezone?: string;
    // Limits
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  };
  options?: {
    priority?: number;
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
  };
}

class JobScheduler {
  private queue: Queue;
  private scheduledJobs: Map<string, string> = new Map(); // name -> jobKey

  constructor(connection: Redis) {
    this.queue = new Queue('scheduler', { connection });
  }

  async schedule(config: ScheduledJobConfig): Promise<string> {
    const { name, data, schedule, options } = config;
    const jobId = `scheduled_${name}_${Date.now()}`;

    switch (schedule.type) {
      case 'once':
        return this.scheduleOnce(jobId, name, data, schedule, options);
      case 'recurring':
        return this.scheduleRecurring(jobId, name, data, schedule, options);
      case 'cron':
        return this.scheduleCron(jobId, name, data, schedule, options);
      default:
        throw new Error(`Unknown schedule type: ${schedule.type}`);
    }
  }

  private async scheduleOnce(
    jobId: string,
    name: string,
    data: any,
    schedule: ScheduledJobConfig['schedule'],
    options?: ScheduledJobConfig['options']
  ): Promise<string> {
    let delay: number;

    if (schedule.scheduledTime) {
      delay = schedule.scheduledTime.getTime() - Date.now();
      if (delay < 0) {
        throw new Error('Scheduled time is in the past');
      }
    } else if (schedule.delay) {
      delay = schedule.delay;
    } else {
      throw new Error('Either scheduledTime or delay must be provided');
    }

    const job = await this.queue.add(name, data, {
      jobId,
      delay,
      ...options,
    });

    this.scheduledJobs.set(name, jobId);
    return jobId;
  }

  private async scheduleRecurring(
    jobId: string,
    name: string,
    data: any,
    schedule: ScheduledJobConfig['schedule'],
    options?: ScheduledJobConfig['options']
  ): Promise<string> {
    if (!schedule.interval) {
      throw new Error('Interval required for recurring schedule');
    }

    const job = await this.queue.add(name, data, {
      repeat: {
        every: schedule.interval,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        limit: schedule.limit,
      },
      ...options,
    });

    const key = `${name}:::${schedule.interval}`;
    this.scheduledJobs.set(name, key);
    return key;
  }

  private async scheduleCron(
    jobId: string,
    name: string,
    data: any,
    schedule: ScheduledJobConfig['schedule'],
    options?: ScheduledJobConfig['options']
  ): Promise<string> {
    if (!schedule.pattern) {
      throw new Error('Cron pattern required for cron schedule');
    }

    const job = await this.queue.add(name, data, {
      repeat: {
        pattern: schedule.pattern,
        tz: schedule.timezone,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        limit: schedule.limit,
      },
      ...options,
    });

    const key = `${name}:${schedule.pattern}::${schedule.timezone || ''}`;
    this.scheduledJobs.set(name, key);
    return key;
  }

  async cancel(name: string): Promise<boolean> {
    const key = this.scheduledJobs.get(name);
    if (!key) {
      return false;
    }

    // Check if it's a repeatable job
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const repeatable = repeatableJobs.find(j => j.name === name);

    if (repeatable) {
      await this.queue.removeRepeatableByKey(repeatable.key);
    } else {
      // It's a one-time delayed job
      const job = await this.queue.getJob(key);
      if (job) {
        await job.remove();
      }
    }

    this.scheduledJobs.delete(name);
    return true;
  }

  async listScheduled(): Promise<any[]> {
    const [repeatable, delayed] = await Promise.all([
      this.queue.getRepeatableJobs(),
      this.queue.getDelayed(),
    ]);

    return [
      ...repeatable.map(j => ({
        name: j.name,
        type: j.pattern ? 'cron' : 'recurring',
        pattern: j.pattern,
        every: j.every,
        next: new Date(j.next).toISOString(),
        timezone: j.tz,
      })),
      ...delayed.map(j => ({
        name: j.name,
        type: 'once',
        scheduledFor: new Date(j.timestamp + (j.opts.delay || 0)).toISOString(),
        data: j.data,
      })),
    ];
  }
}
```

## Dynamic Schedule Management

Allow runtime schedule modifications:

```typescript
class DynamicScheduler {
  private queue: Queue;
  private redis: Redis;

  constructor(connection: Redis) {
    this.queue = new Queue('dynamic', { connection });
    this.redis = connection;
  }

  async updateSchedule(
    name: string,
    newSchedule: { pattern?: string; every?: number; timezone?: string }
  ): Promise<void> {
    // Find and remove existing schedule
    const existing = await this.queue.getRepeatableJobs();
    const job = existing.find(j => j.name === name);

    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    // Get stored job data
    const jobDataKey = `scheduler:data:${name}`;
    const storedData = await this.redis.get(jobDataKey);
    const data = storedData ? JSON.parse(storedData) : {};

    // Create new schedule
    await this.queue.add(name, data, {
      repeat: {
        pattern: newSchedule.pattern,
        every: newSchedule.every,
        tz: newSchedule.timezone,
      },
    });

    console.log(`Updated schedule for ${name}`);
  }

  async pauseSchedule(name: string): Promise<void> {
    const jobs = await this.queue.getRepeatableJobs();
    const job = jobs.find(j => j.name === name);

    if (job) {
      // Store current config
      await this.redis.hset(`scheduler:paused:${name}`, {
        key: job.key,
        pattern: job.pattern || '',
        every: job.every?.toString() || '',
        tz: job.tz || '',
      });

      await this.queue.removeRepeatableByKey(job.key);
      console.log(`Paused schedule: ${name}`);
    }
  }

  async resumeSchedule(name: string): Promise<void> {
    const paused = await this.redis.hgetall(`scheduler:paused:${name}`);

    if (Object.keys(paused).length === 0) {
      throw new Error(`No paused schedule found for ${name}`);
    }

    const jobDataKey = `scheduler:data:${name}`;
    const storedData = await this.redis.get(jobDataKey);
    const data = storedData ? JSON.parse(storedData) : {};

    await this.queue.add(name, data, {
      repeat: {
        pattern: paused.pattern || undefined,
        every: paused.every ? parseInt(paused.every) : undefined,
        tz: paused.tz || undefined,
      },
    });

    await this.redis.del(`scheduler:paused:${name}`);
    console.log(`Resumed schedule: ${name}`);
  }
}
```

## Timezone-Aware Scheduling

Handle schedules across timezones:

```typescript
class TimezoneScheduler {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('timezone-aware', { connection });
  }

  async scheduleForTimezone(
    name: string,
    data: any,
    localTime: { hour: number; minute: number },
    timezone: string,
    daysOfWeek?: number[] // 0 = Sunday, 6 = Saturday
  ): Promise<void> {
    // Build cron pattern
    const dayPattern = daysOfWeek ? daysOfWeek.join(',') : '*';
    const pattern = `${localTime.minute} ${localTime.hour} * * ${dayPattern}`;

    await this.queue.add(name, { ...data, timezone }, {
      repeat: {
        pattern,
        tz: timezone,
      },
    });

    console.log(`Scheduled ${name} for ${localTime.hour}:${localTime.minute} in ${timezone}`);
  }

  async scheduleForMultipleTimezones(
    baseName: string,
    data: any,
    localTime: { hour: number; minute: number },
    timezones: string[]
  ): Promise<void> {
    for (const tz of timezones) {
      const name = `${baseName}_${tz.replace('/', '_')}`;
      await this.scheduleForTimezone(name, data, localTime, tz);
    }
  }

  // Schedule for "business hours" in a timezone
  async scheduleBusinessHours(
    name: string,
    data: any,
    timezone: string,
    intervalMinutes: number = 60
  ): Promise<void> {
    // 9 AM to 5 PM, Monday to Friday
    const pattern = `*/${intervalMinutes} 9-17 * * 1-5`;

    await this.queue.add(name, data, {
      repeat: {
        pattern,
        tz: timezone,
      },
    });
  }
}

// Usage
const tzScheduler = new TimezoneScheduler(connection);

// Schedule daily standup reminders at 9 AM in each team's timezone
await tzScheduler.scheduleForMultipleTimezones(
  'standup-reminder',
  { message: 'Daily standup in 15 minutes!' },
  { hour: 9, minute: 0 },
  ['America/New_York', 'Europe/London', 'Asia/Tokyo']
);
```

## Schedule Templates

Create reusable schedule templates:

```typescript
interface ScheduleTemplate {
  name: string;
  description: string;
  pattern?: string;
  every?: number;
  timezone?: string;
}

const scheduleTemplates: Record<string, ScheduleTemplate> = {
  'every-minute': {
    name: 'Every Minute',
    description: 'Runs every minute',
    pattern: '* * * * *',
  },
  'every-5-minutes': {
    name: 'Every 5 Minutes',
    description: 'Runs every 5 minutes',
    every: 5 * 60 * 1000,
  },
  'hourly': {
    name: 'Hourly',
    description: 'Runs at the start of every hour',
    pattern: '0 * * * *',
  },
  'daily-9am': {
    name: 'Daily at 9 AM',
    description: 'Runs every day at 9 AM',
    pattern: '0 9 * * *',
  },
  'weekdays-9am': {
    name: 'Weekdays at 9 AM',
    description: 'Runs Monday through Friday at 9 AM',
    pattern: '0 9 * * 1-5',
  },
  'weekly-monday': {
    name: 'Weekly on Monday',
    description: 'Runs every Monday at midnight',
    pattern: '0 0 * * 1',
  },
  'monthly-first': {
    name: 'Monthly First Day',
    description: 'Runs on the first day of every month',
    pattern: '0 0 1 * *',
  },
};

class TemplatedScheduler {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('templated', { connection });
  }

  async scheduleFromTemplate(
    templateId: string,
    jobName: string,
    data: any,
    timezoneOverride?: string
  ): Promise<void> {
    const template = scheduleTemplates[templateId];
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    const repeatOptions: any = {};

    if (template.pattern) {
      repeatOptions.pattern = template.pattern;
    } else if (template.every) {
      repeatOptions.every = template.every;
    }

    if (timezoneOverride || template.timezone) {
      repeatOptions.tz = timezoneOverride || template.timezone;
    }

    await this.queue.add(jobName, data, {
      repeat: repeatOptions,
    });

    console.log(`Scheduled ${jobName} using template ${template.name}`);
  }

  listTemplates(): ScheduleTemplate[] {
    return Object.values(scheduleTemplates);
  }
}
```

## Schedule Monitoring and Alerts

Monitor schedule execution:

```typescript
class ScheduleMonitor {
  private queue: Queue;
  private queueEvents: QueueEvents;
  private lastExecutions: Map<string, number> = new Map();
  private missedThreshold: number = 1.5; // Alert if 1.5x expected interval passes

  constructor(connection: Redis, queueName: string) {
    this.queue = new Queue(queueName, { connection });
    this.queueEvents = new QueueEvents(queueName, { connection });
    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.recordExecution(jobId);
    });

    // Check for missed schedules periodically
    setInterval(() => this.checkMissedSchedules(), 60000);
  }

  private recordExecution(jobId: string) {
    // Extract schedule name from job ID
    const parts = jobId.split(':');
    if (parts.length >= 2) {
      const scheduleName = parts[0];
      this.lastExecutions.set(scheduleName, Date.now());
    }
  }

  private async checkMissedSchedules() {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const now = Date.now();

    for (const job of repeatableJobs) {
      const expectedInterval = job.every || this.cronToInterval(job.pattern);
      if (!expectedInterval) continue;

      const lastExec = this.lastExecutions.get(job.name);
      if (lastExec) {
        const timeSinceLastExec = now - lastExec;
        if (timeSinceLastExec > expectedInterval * this.missedThreshold) {
          this.alertMissedSchedule(job.name, timeSinceLastExec, expectedInterval);
        }
      }
    }
  }

  private cronToInterval(pattern?: string): number | null {
    // Simple estimation - in production use a cron parser
    if (!pattern) return null;
    if (pattern.startsWith('*/')) {
      const minutes = parseInt(pattern.split(' ')[0].replace('*/', ''));
      return minutes * 60 * 1000;
    }
    return null;
  }

  private alertMissedSchedule(name: string, actual: number, expected: number) {
    console.warn(`ALERT: Schedule ${name} may have missed execution.
      Expected interval: ${expected}ms
      Time since last: ${actual}ms`);
    // Send to alerting system
  }

  async getScheduleHealth(): Promise<any[]> {
    const jobs = await this.queue.getRepeatableJobs();
    const now = Date.now();

    return jobs.map(job => {
      const lastExec = this.lastExecutions.get(job.name);
      return {
        name: job.name,
        pattern: job.pattern,
        every: job.every,
        nextRun: new Date(job.next).toISOString(),
        lastRun: lastExec ? new Date(lastExec).toISOString() : null,
        healthy: lastExec ? (now - lastExec < (job.every || 3600000) * 1.5) : null,
      };
    });
  }
}
```

## Best Practices

1. **Use meaningful job names** - Makes monitoring and debugging easier.

2. **Always specify timezone** - Prevent issues with DST changes.

3. **Set appropriate limits** - Use `limit` and `endDate` to prevent runaway jobs.

4. **Monitor schedule health** - Track if jobs are running on time.

5. **Handle schedule conflicts** - Decide what happens if previous run is still active.

6. **Document schedules** - Maintain a registry of all scheduled jobs.

7. **Test schedule patterns** - Verify cron patterns produce expected times.

8. **Plan for restarts** - Schedules persist in Redis across restarts.

9. **Clean up old schedules** - Remove schedules that are no longer needed.

10. **Use templates** - Standardize common scheduling patterns.

## Conclusion

BullMQ provides powerful job scheduling capabilities that go far beyond simple cron jobs. By combining delayed jobs, repeatable schedules, and custom scheduling logic, you can build sophisticated automation systems. Remember to handle timezones properly, monitor schedule health, and clean up old schedules to maintain a healthy scheduling system.
