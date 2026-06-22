# How to Use BullMQ Repeatable Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Cron Jobs, Recurring Tasks, Job Scheduling, Automation

Description: A comprehensive guide to implementing repeatable jobs with BullMQ, including cron-like scheduling, interval-based repetition, managing recurring tasks, and building reliable automated job systems.

---

Repeatable jobs in BullMQ allow you to schedule jobs that run automatically at specified intervals or cron schedules. In BullMQ 5.16.0 and newer, use Job Schedulers to create and manage repeatable jobs. This is perfect for tasks like sending daily reports, cleanup operations, or periodic data synchronization. This guide covers everything you need to know about implementing repeatable jobs.

## Understanding Repeatable Jobs

Repeatable jobs are defined once and automatically create new job instances based on a schedule:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('scheduled-tasks', { connection });

// Add a repeatable job with cron pattern
await queue.upsertJobScheduler(
  'daily-report-scheduler',
  {
    pattern: '0 9 * * *', // Every day at 9 AM
  },
  {
    name: 'daily-report',
    data: { reportType: 'daily' },
  }
);
```

## Cron-Based Scheduling

Use cron patterns for precise scheduling:

```typescript
// Cron pattern: minute hour day-of-month month day-of-week

// Every minute
await queue.upsertJobScheduler('check-health-scheduler', { pattern: '* * * * *' }, {
  name: 'check-health',
  data: {},
});

// Every hour at minute 0
await queue.upsertJobScheduler('hourly-sync-scheduler', { pattern: '0 * * * *' }, {
  name: 'hourly-sync',
  data: {},
});

// Every day at midnight
await queue.upsertJobScheduler('daily-cleanup-scheduler', { pattern: '0 0 * * *' }, {
  name: 'daily-cleanup',
  data: {},
});

// Every Monday at 9 AM
await queue.upsertJobScheduler('weekly-report-scheduler', { pattern: '0 9 * * 1' }, {
  name: 'weekly-report',
  data: {},
});

// First day of every month at 6 AM
await queue.upsertJobScheduler('monthly-billing-scheduler', { pattern: '0 6 1 * *' }, {
  name: 'monthly-billing',
  data: {},
});

// Every 15 minutes
await queue.upsertJobScheduler('sync-data-scheduler', { pattern: '*/15 * * * *' }, {
  name: 'sync-data',
  data: {},
});

// Business hours only (9 AM - 5 PM, Monday - Friday)
await queue.upsertJobScheduler('business-check-scheduler', { pattern: '0 9-17 * * 1-5' }, {
  name: 'business-check',
  data: {},
});
```

## Interval-Based Repetition

Use millisecond intervals for simpler scheduling:

```typescript
// Every 5 seconds
await queue.upsertJobScheduler('heartbeat-scheduler', { every: 5000 }, {
  name: 'heartbeat',
  data: {},
});

// Every minute
await queue.upsertJobScheduler('quick-check-scheduler', { every: 60000 }, {
  name: 'quick-check',
  data: {},
});

// Every 5 minutes
await queue.upsertJobScheduler('sync-status-scheduler', { every: 5 * 60 * 1000 }, {
  name: 'sync-status',
  data: {},
});

// Every hour
await queue.upsertJobScheduler('hourly-task-scheduler', { every: 60 * 60 * 1000 }, {
  name: 'hourly-task',
  data: {},
});
```

## Limiting Repetitions

Control how many times a job repeats:

```typescript
// Run 10 times, every hour
await queue.upsertJobScheduler(
  'limited-task-scheduler',
  {
    every: 60 * 60 * 1000,
    limit: 10,
  },
  {
    name: 'limited-task',
    data: {},
  }
);

// Run until a specific date
const endDate = new Date('2024-12-31');
await queue.upsertJobScheduler(
  'until-eoy-scheduler',
  {
    pattern: '0 9 * * *',
    endDate,
  },
  {
    name: 'until-eoy',
    data: {},
  }
);

// Start from a specific date
const startDate = new Date('2024-06-01');
await queue.upsertJobScheduler(
  'from-june-scheduler',
  {
    pattern: '0 9 * * *',
    startDate,
  },
  {
    name: 'from-june',
    data: {},
  }
);
```

## Timezone Support

Schedule jobs in specific timezones:

```typescript
// Daily at 9 AM in New York timezone
await queue.upsertJobScheduler(
  'ny-morning-report-scheduler',
  {
    pattern: '0 9 * * *',
    tz: 'America/New_York',
  },
  {
    name: 'ny-morning-report',
    data: {},
  }
);

// Daily at 9 AM in Tokyo timezone
await queue.upsertJobScheduler(
  'tokyo-morning-report-scheduler',
  {
    pattern: '0 9 * * *',
    tz: 'Asia/Tokyo',
  },
  {
    name: 'tokyo-morning-report',
    data: {},
  }
);

// Multiple timezone support
const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
for (const tz of timezones) {
  await queue.upsertJobScheduler(
    `morning-report-${tz}-scheduler`,
    {
      pattern: '0 9 * * *',
      tz,
    },
    {
      name: `morning-report-${tz}`,
      data: { timezone: tz },
    }
  );
}
```

## Managing Repeatable Jobs

### Listing Repeatable Jobs

```typescript
class RepeatableJobManager {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async listRepeatableJobs() {
    const schedulers = await this.queue.getJobSchedulers();

    return schedulers.map(scheduler => ({
      id: scheduler.key,
      name: scheduler.name,
      endDate: scheduler.endDate,
      tz: scheduler.tz,
      pattern: scheduler.pattern,
      every: scheduler.every,
      next: new Date(scheduler.next).toISOString(),
    }));
  }

  async findRepeatableJob(name: string) {
    const schedulers = await this.queue.getJobSchedulers();
    return schedulers.find(scheduler => scheduler.name === name);
  }
}
```

### Removing Repeatable Jobs

```typescript
class RepeatableJobManager {
  // ... previous code

  async removeRepeatableJob(schedulerId: string) {
    await this.queue.removeJobScheduler(schedulerId);
    console.log(`Removed repeatable job scheduler: ${schedulerId}`);
  }

  async removeAllRepeatableJobs() {
    const schedulers = await this.queue.getJobSchedulers();

    for (const scheduler of schedulers) {
      await this.queue.removeJobScheduler(scheduler.key);
    }

    console.log(`Removed ${schedulers.length} repeatable job schedulers`);
  }

  async removeRepeatableJobByName(name: string) {
    const schedulers = await this.queue.getJobSchedulers();
    const matching = schedulers.filter(scheduler => scheduler.name === name);

    for (const scheduler of matching) {
      await this.queue.removeJobScheduler(scheduler.key);
    }

    console.log(`Removed ${matching.length} job schedulers named ${name}`);
  }
}
```

## Preventing Duplicate Repeatable Jobs

Use stable scheduler IDs so jobs are created or updated without duplicate schedules:

```typescript
class SafeRepeatableJobRegistrar {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async registerRepeatable(
    schedulerId: string,
    name: string,
    data: Record<string, unknown>,
    repeatOptions: { pattern?: string; every?: number; tz?: string }
  ) {
    const job = await this.queue.upsertJobScheduler(schedulerId, repeatOptions, {
      name,
      data,
    });

    console.log(`Registered repeatable job scheduler: ${schedulerId}`);
    return job;
  }

  async updateRepeatable(
    schedulerId: string,
    name: string,
    data: Record<string, unknown>,
    newRepeat: { pattern?: string; every?: number; tz?: string }
  ) {
    return this.queue.upsertJobScheduler(schedulerId, newRepeat, {
      name,
      data,
    });
  }
}
```

## Practical Examples

### Daily Report Generation

```typescript
interface ReportJobData {
  reportType: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'csv' | 'html';
}

class ReportScheduler {
  private queue: Queue<ReportJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('reports', { connection });
  }

  async scheduleReports() {
    // Daily sales report at 7 AM
    await this.queue.upsertJobScheduler(
      'sales-report-scheduler',
      {
        pattern: '0 7 * * *',
        tz: 'America/New_York',
      },
      {
        name: 'sales-report',
        data: {
          reportType: 'daily',
          recipients: ['sales@company.com'],
          format: 'pdf',
        },
      }
    );

    // Weekly summary every Monday at 8 AM
    await this.queue.upsertJobScheduler(
      'weekly-summary-scheduler',
      {
        pattern: '0 8 * * 1',
        tz: 'America/New_York',
      },
      {
        name: 'weekly-summary',
        data: {
          reportType: 'weekly',
          recipients: ['management@company.com'],
          format: 'pdf',
        },
      }
    );

    // Monthly financial report on 1st at 6 AM
    await this.queue.upsertJobScheduler(
      'monthly-financial-scheduler',
      {
        pattern: '0 6 1 * *',
        tz: 'America/New_York',
      },
      {
        name: 'monthly-financial',
        data: {
          reportType: 'monthly',
          recipients: ['finance@company.com', 'cfo@company.com'],
          format: 'pdf',
        },
      }
    );
  }
}

// Worker
const reportWorker = new Worker<ReportJobData>('reports', async (job) => {
  console.log(`Generating ${job.data.reportType} report`);

  const report = await generateReport(job.data.reportType, job.data.format);
  await sendReportEmail(job.data.recipients, report);

  return { generated: true, sentTo: job.data.recipients };
}, { connection });
```

### Periodic Cleanup Jobs

```typescript
interface CleanupJobData {
  type: 'logs' | 'temp-files' | 'expired-sessions' | 'old-data';
  olderThanDays: number;
}

class CleanupScheduler {
  private queue: Queue<CleanupJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('cleanup', { connection });
  }

  async scheduleCleanupJobs() {
    // Clean old logs every night at 2 AM
    await this.queue.upsertJobScheduler('clean-logs-scheduler', { pattern: '0 2 * * *' }, {
      name: 'clean-logs',
      data: {
        type: 'logs',
        olderThanDays: 30,
      },
    });

    // Clean temp files every 6 hours
    await this.queue.upsertJobScheduler('clean-temp-scheduler', { every: 6 * 60 * 60 * 1000 }, {
      name: 'clean-temp',
      data: {
        type: 'temp-files',
        olderThanDays: 1,
      },
    });

    // Clean expired sessions every hour
    await this.queue.upsertJobScheduler('clean-sessions-scheduler', { pattern: '0 * * * *' }, {
      name: 'clean-sessions',
      data: {
        type: 'expired-sessions',
        olderThanDays: 0,
      },
    });

    // Archive old data weekly on Sunday at 3 AM
    await this.queue.upsertJobScheduler('archive-old-data-scheduler', { pattern: '0 3 * * 0' }, {
      name: 'archive-old-data',
      data: {
        type: 'old-data',
        olderThanDays: 90,
      },
    });
  }
}
```

### Health Check Monitoring

```typescript
interface HealthCheckJobData {
  service: string;
  endpoint: string;
  expectedStatus: number;
  timeout: number;
}

class HealthMonitor {
  private queue: Queue<HealthCheckJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('health-checks', { connection });
  }

  async registerHealthChecks() {
    const services = [
      { service: 'api', endpoint: 'https://api.example.com/health', interval: 30000 },
      { service: 'database', endpoint: 'https://api.example.com/db-health', interval: 60000 },
      { service: 'cache', endpoint: 'https://api.example.com/cache-health', interval: 30000 },
    ];

    for (const svc of services) {
      await this.queue.upsertJobScheduler(
        `health-check-${svc.service}-scheduler`,
        { every: svc.interval },
        {
          name: `health-${svc.service}`,
          data: {
            service: svc.service,
            endpoint: svc.endpoint,
            expectedStatus: 200,
            timeout: 5000,
          },
        }
      );
    }
  }
}

// Worker
const healthWorker = new Worker<HealthCheckJobData>('health-checks', async (job) => {
  const { service, endpoint, expectedStatus, timeout } = job.data;

  const startTime = Date.now();
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(timeout),
    });

    const latency = Date.now() - startTime;
    const healthy = response.status === expectedStatus;

    if (!healthy) {
      console.warn(`Health check failed for ${service}: ${response.status}`);
      // Send alert
    }

    return { service, healthy, latency, status: response.status };
  } catch (error) {
    console.error(`Health check error for ${service}:`, error);
    // Send alert
    return {
      service,
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}, { connection });
```

## Handling Missed Executions

When workers are down or too slow, due jobs can wait in the queue, but BullMQ schedulers do not backfill every missed interval. Monitor waiting and active jobs so you can detect delayed processing:

```typescript
const queue = new Queue('scheduled', {
  connection,
  defaultJobOptions: {
    // Keep completed jobs from growing unbounded
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Check for backlog on startup
async function handleMissedJobs() {
  const waiting = await queue.getWaiting();
  const active = await queue.getActive();

  // Group by job name
  const jobsByName = new Map<string, number>();
  [...waiting, ...active].forEach(job => {
    const count = jobsByName.get(job.name) || 0;
    jobsByName.set(job.name, count + 1);
  });

  // Alert if backlog
  for (const [name, count] of jobsByName) {
    if (count > 5) {
      console.warn(`Backlog detected for ${name}: ${count} jobs`);
    }
  }
}
```

## Best Practices

1. **Use stable scheduler IDs** - Prevent duplicate schedules by using explicit scheduler IDs with `upsertJobScheduler`.

2. **Clean up old configurations** - Remove outdated repeatable jobs on deploy.

3. **Use timezones** - Always specify timezone for business-hour schedules.

4. **Monitor execution** - Track if repeatable jobs are running as expected.

5. **Handle overlapping executions** - Decide if concurrent runs are allowed.

6. **Log job registration** - Track when repeatable jobs are added/removed.

7. **Test cron patterns** - Verify patterns produce expected schedules.

8. **Consider DST** - Daylight saving time affects cron schedules.

9. **Set reasonable intervals** - Avoid overwhelming your system.

10. **Document schedules** - Maintain a list of all repeatable jobs.

## Conclusion

Repeatable jobs in BullMQ provide a powerful way to automate recurring tasks. Whether you need cron-like schedules for daily reports or simple intervals for health checks, BullMQ's repeatable jobs feature handles the scheduling complexity. Remember to manage your repeatable jobs carefully, preventing duplicates and cleaning up outdated schedules during deployments.
