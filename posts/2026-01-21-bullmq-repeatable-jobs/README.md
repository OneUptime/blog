# How to Use BullMQ Repeatable Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Cron Jobs, Recurring Tasks, Job Scheduling, Automation

Description: A comprehensive guide to implementing repeatable jobs with BullMQ, including cron-like scheduling, interval-based repetition, managing recurring tasks, and building reliable automated job systems.

---

Repeatable jobs in BullMQ allow you to schedule jobs that run automatically at specified intervals or cron schedules. This is perfect for tasks like sending daily reports, cleanup operations, or periodic data synchronization. This guide covers everything you need to know about implementing repeatable jobs.

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
await queue.add(
  'daily-report',
  { reportType: 'daily' },
  {
    repeat: {
      pattern: '0 9 * * *', // Every day at 9 AM
    },
  }
);
```

## Cron-Based Scheduling

Use cron patterns for precise scheduling:

```typescript
// Cron pattern: minute hour day-of-month month day-of-week

// Every minute
await queue.add('check-health', {}, {
  repeat: { pattern: '* * * * *' },
});

// Every hour at minute 0
await queue.add('hourly-sync', {}, {
  repeat: { pattern: '0 * * * *' },
});

// Every day at midnight
await queue.add('daily-cleanup', {}, {
  repeat: { pattern: '0 0 * * *' },
});

// Every Monday at 9 AM
await queue.add('weekly-report', {}, {
  repeat: { pattern: '0 9 * * 1' },
});

// First day of every month at 6 AM
await queue.add('monthly-billing', {}, {
  repeat: { pattern: '0 6 1 * *' },
});

// Every 15 minutes
await queue.add('sync-data', {}, {
  repeat: { pattern: '*/15 * * * *' },
});

// Business hours only (9 AM - 5 PM, Monday - Friday)
await queue.add('business-check', {}, {
  repeat: { pattern: '0 9-17 * * 1-5' },
});
```

## Interval-Based Repetition

Use millisecond intervals for simpler scheduling:

```typescript
// Every 5 seconds
await queue.add('heartbeat', {}, {
  repeat: { every: 5000 },
});

// Every minute
await queue.add('quick-check', {}, {
  repeat: { every: 60000 },
});

// Every 5 minutes
await queue.add('sync-status', {}, {
  repeat: { every: 5 * 60 * 1000 },
});

// Every hour
await queue.add('hourly-task', {}, {
  repeat: { every: 60 * 60 * 1000 },
});
```

## Limiting Repetitions

Control how many times a job repeats:

```typescript
// Run 10 times, every hour
await queue.add('limited-task', {}, {
  repeat: {
    every: 60 * 60 * 1000,
    limit: 10,
  },
});

// Run until a specific date
const endDate = new Date('2024-12-31');
await queue.add('until-eoy', {}, {
  repeat: {
    pattern: '0 9 * * *',
    endDate,
  },
});

// Start from a specific date
const startDate = new Date('2024-06-01');
await queue.add('from-june', {}, {
  repeat: {
    pattern: '0 9 * * *',
    startDate,
  },
});
```

## Timezone Support

Schedule jobs in specific timezones:

```typescript
// Daily at 9 AM in New York timezone
await queue.add('ny-morning-report', {}, {
  repeat: {
    pattern: '0 9 * * *',
    tz: 'America/New_York',
  },
});

// Daily at 9 AM in Tokyo timezone
await queue.add('tokyo-morning-report', {}, {
  repeat: {
    pattern: '0 9 * * *',
    tz: 'Asia/Tokyo',
  },
});

// Multiple timezone support
const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
for (const tz of timezones) {
  await queue.add(`morning-report-${tz}`, { timezone: tz }, {
    repeat: {
      pattern: '0 9 * * *',
      tz,
    },
    jobId: `morning-report-${tz}`,
  });
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
    const repeatableJobs = await this.queue.getRepeatableJobs();

    return repeatableJobs.map(job => ({
      key: job.key,
      name: job.name,
      id: job.id,
      endDate: job.endDate,
      tz: job.tz,
      pattern: job.pattern,
      every: job.every,
      next: new Date(job.next).toISOString(),
    }));
  }

  async findRepeatableJob(name: string) {
    const jobs = await this.queue.getRepeatableJobs();
    return jobs.find(job => job.name === name);
  }
}
```

### Removing Repeatable Jobs

```typescript
class RepeatableJobManager {
  // ... previous code

  async removeRepeatableJob(name: string, repeat: { pattern?: string; every?: number }) {
    await this.queue.removeRepeatableByKey(
      `${name}:${repeat.pattern || repeat.every}:::${repeat.tz || ''}`
    );
    console.log(`Removed repeatable job: ${name}`);
  }

  async removeAllRepeatableJobs() {
    const jobs = await this.queue.getRepeatableJobs();

    for (const job of jobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    console.log(`Removed ${jobs.length} repeatable jobs`);
  }

  async removeRepeatableJobByName(name: string) {
    const jobs = await this.queue.getRepeatableJobs();
    const matching = jobs.filter(job => job.name === name);

    for (const job of matching) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    console.log(`Removed ${matching.length} jobs named ${name}`);
  }
}
```

## Preventing Duplicate Repeatable Jobs

Ensure jobs are registered only once:

```typescript
class SafeRepeatableJobRegistrar {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async registerRepeatable(
    name: string,
    data: Record<string, unknown>,
    repeatOptions: { pattern?: string; every?: number; tz?: string }
  ) {
    // Check if already exists
    const existing = await this.queue.getRepeatableJobs();
    const exists = existing.some(
      job => job.name === name &&
             (job.pattern === repeatOptions.pattern || job.every === repeatOptions.every)
    );

    if (exists) {
      console.log(`Repeatable job ${name} already exists, skipping`);
      return null;
    }

    const job = await this.queue.add(name, data, {
      repeat: repeatOptions,
    });

    console.log(`Registered repeatable job: ${name}`);
    return job;
  }

  async updateRepeatable(
    name: string,
    data: Record<string, unknown>,
    oldRepeat: { pattern?: string; every?: number },
    newRepeat: { pattern?: string; every?: number; tz?: string }
  ) {
    // Remove old job
    const jobs = await this.queue.getRepeatableJobs();
    const oldJob = jobs.find(j => j.name === name);
    if (oldJob) {
      await this.queue.removeRepeatableByKey(oldJob.key);
    }

    // Add new job
    return this.queue.add(name, data, {
      repeat: newRepeat,
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
    await this.queue.add('sales-report', {
      reportType: 'daily',
      recipients: ['sales@company.com'],
      format: 'pdf',
    }, {
      repeat: {
        pattern: '0 7 * * *',
        tz: 'America/New_York',
      },
    });

    // Weekly summary every Monday at 8 AM
    await this.queue.add('weekly-summary', {
      reportType: 'weekly',
      recipients: ['management@company.com'],
      format: 'pdf',
    }, {
      repeat: {
        pattern: '0 8 * * 1',
        tz: 'America/New_York',
      },
    });

    // Monthly financial report on 1st at 6 AM
    await this.queue.add('monthly-financial', {
      reportType: 'monthly',
      recipients: ['finance@company.com', 'cfo@company.com'],
      format: 'pdf',
    }, {
      repeat: {
        pattern: '0 6 1 * *',
        tz: 'America/New_York',
      },
    });
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
    await this.queue.add('clean-logs', {
      type: 'logs',
      olderThanDays: 30,
    }, {
      repeat: { pattern: '0 2 * * *' },
    });

    // Clean temp files every 6 hours
    await this.queue.add('clean-temp', {
      type: 'temp-files',
      olderThanDays: 1,
    }, {
      repeat: { every: 6 * 60 * 60 * 1000 },
    });

    // Clean expired sessions every hour
    await this.queue.add('clean-sessions', {
      type: 'expired-sessions',
      olderThanDays: 0,
    }, {
      repeat: { pattern: '0 * * * *' },
    });

    // Archive old data weekly on Sunday at 3 AM
    await this.queue.add('archive-old-data', {
      type: 'old-data',
      olderThanDays: 90,
    }, {
      repeat: { pattern: '0 3 * * 0' },
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
      await this.queue.add(`health-${svc.service}`, {
        service: svc.service,
        endpoint: svc.endpoint,
        expectedStatus: 200,
        timeout: 5000,
      }, {
        repeat: { every: svc.interval },
        jobId: `health-check-${svc.service}`,
      });
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
    return { service, healthy: false, error: error.message };
  }
}, { connection });
```

## Handling Missed Executions

When a worker is down, repeatable jobs accumulate. Handle this:

```typescript
const queue = new Queue('scheduled', {
  connection,
  defaultJobOptions: {
    // Don't create job if previous is still waiting/active
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

1. **Use unique job IDs** - Prevent duplicate registrations with explicit job IDs.

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
