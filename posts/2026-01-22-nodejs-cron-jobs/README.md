# How to Create Cron Jobs in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Cron, Scheduling, Automation, Tasks

Description: Learn how to create scheduled tasks and cron jobs in Node.js using node-cron, node-schedule, and agenda for recurring task automation.

---

Cron jobs allow you to schedule tasks to run automatically at specified intervals. Node.js has several libraries for implementing scheduled tasks, from simple cron expressions to complex job scheduling systems.

## Using node-cron

The simplest way to schedule tasks in Node.js:

```bash
npm install node-cron
```

### Basic Usage

```javascript
const cron = require('node-cron');

// Run every minute
cron.schedule('* * * * *', () => {
  console.log('Running every minute');
});

// Run every hour
cron.schedule('0 * * * *', () => {
  console.log('Running every hour');
});

// Run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running at midnight');
});

// Run every Monday at 9 AM
cron.schedule('0 9 * * 1', () => {
  console.log('Running every Monday at 9 AM');
});
```

### Cron Expression Format

```
 ┌────────────── second (optional, 0-59)
 │ ┌──────────── minute (0-59)
 │ │ ┌────────── hour (0-23)
 │ │ │ ┌──────── day of month (1-31)
 │ │ │ │ ┌────── month (1-12)
 │ │ │ │ │ ┌──── day of week (0-7, 0 and 7 are Sunday)
 │ │ │ │ │ │
 * * * * * *
```

Common patterns:

```javascript
const cron = require('node-cron');

// Every 5 minutes
cron.schedule('*/5 * * * *', task);

// Every 30 seconds
cron.schedule('*/30 * * * * *', task);  // 6-field with seconds

// Every weekday at 6 AM
cron.schedule('0 6 * * 1-5', task);

// First day of every month at noon
cron.schedule('0 12 1 * *', task);

// Every quarter (Jan, Apr, Jul, Oct) on the 1st
cron.schedule('0 0 1 1,4,7,10 *', task);

// Multiple times
cron.schedule('0 8,12,18 * * *', task);  // 8 AM, 12 PM, 6 PM
```

### Task Management

```javascript
const cron = require('node-cron');

// Create scheduled task
const task = cron.schedule('* * * * *', () => {
  console.log('Running task');
}, {
  scheduled: false,  // Don't start immediately
  timezone: 'America/New_York',
});

// Start the task
task.start();

// Stop the task
task.stop();

// Validate cron expression
const isValid = cron.validate('* * * * *');
console.log(isValid);  // true
```

### Async Tasks

```javascript
const cron = require('node-cron');

cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Starting async task');
    await performDatabaseCleanup();
    await sendReports();
    console.log('Task completed');
  } catch (error) {
    console.error('Task failed:', error);
  }
});
```

## Using node-schedule

More flexible scheduling with date-based jobs:

```bash
npm install node-schedule
```

### Basic Scheduling

```javascript
const schedule = require('node-schedule');

// Run at specific time
const job = schedule.scheduleJob('42 * * * *', () => {
  console.log('Running at minute 42 of every hour');
});

// Using Date object
const date = new Date(2024, 11, 25, 10, 0, 0);  // Dec 25, 2024 at 10 AM
schedule.scheduleJob(date, () => {
  console.log('Merry Christmas!');
});
```

### RecurrenceRule

```javascript
const schedule = require('node-schedule');

// Create rule
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];  // Every day
rule.hour = 10;
rule.minute = 0;

schedule.scheduleJob(rule, () => {
  console.log('Running at 10 AM every day');
});

// Every business day at 9 AM
const businessRule = new schedule.RecurrenceRule();
businessRule.dayOfWeek = [1, 2, 3, 4, 5];  // Mon-Fri
businessRule.hour = 9;
businessRule.minute = 0;
businessRule.tz = 'America/New_York';

schedule.scheduleJob(businessRule, () => {
  console.log('Good morning!');
});
```

### Object Literal Syntax

```javascript
const schedule = require('node-schedule');

// Every 10 minutes
schedule.scheduleJob({ minute: [0, 10, 20, 30, 40, 50] }, task);

// Specific times
schedule.scheduleJob({ hour: 14, minute: 30 }, task);  // 2:30 PM

// Range of days
schedule.scheduleJob({ 
  dayOfWeek: { start: 1, end: 5 },  // Mon-Fri
  hour: 9,
  minute: 0,
}, task);
```

### Job Management

```javascript
const schedule = require('node-schedule');

// Create named job
const job = schedule.scheduleJob('myJob', '* * * * *', () => {
  console.log('Named job running');
});

// Cancel job
job.cancel();

// Reschedule
job.reschedule('*/5 * * * *');

// Get all scheduled jobs
const jobs = schedule.scheduledJobs;
console.log(Object.keys(jobs));

// Cancel all jobs
schedule.gracefulShutdown();
```

### Handle Next Invocation

```javascript
const schedule = require('node-schedule');

const job = schedule.scheduleJob('*/5 * * * *', () => {
  console.log('Task running');
});

// Get next scheduled run
console.log('Next run:', job.nextInvocation());

// Cancel next invocation only
job.cancelNext();
```

## Using Agenda (MongoDB-backed)

For persistent job scheduling with MongoDB:

```bash
npm install agenda
```

### Setup

```javascript
const Agenda = require('agenda');

const agenda = new Agenda({
  db: { address: 'mongodb://localhost/agenda' },
  processEvery: '30 seconds',
});

// Define a job
agenda.define('send email', async (job) => {
  const { to, subject, body } = job.attrs.data;
  await sendEmail(to, subject, body);
});

// Start agenda
await agenda.start();

// Schedule job
await agenda.schedule('in 5 minutes', 'send email', {
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Welcome!',
});
```

### Recurring Jobs

```javascript
const Agenda = require('agenda');

const agenda = new Agenda({
  db: { address: 'mongodb://localhost/agenda' },
});

agenda.define('daily report', async (job) => {
  const report = await generateDailyReport();
  await emailReport(report);
});

await agenda.start();

// Every day at 9 AM
await agenda.every('0 9 * * *', 'daily report');

// Every 2 hours
await agenda.every('2 hours', 'cleanup task');

// Every Monday
await agenda.every('0 0 * * 1', 'weekly backup');
```

### Job Options

```javascript
const Agenda = require('agenda');

const agenda = new Agenda({
  db: { address: 'mongodb://localhost/agenda' },
});

agenda.define('important task', {
  priority: 'high',
  concurrency: 5,  // Run 5 at a time
}, async (job) => {
  // Task implementation
});

// Schedule with options
await agenda.schedule('tomorrow at noon', 'send email', {
  to: 'user@example.com',
});

// Now
await agenda.now('send email', { to: 'user@example.com' });
```

### Job Events

```javascript
const Agenda = require('agenda');

const agenda = new Agenda({ db: { address: 'mongodb://localhost/agenda' } });

// Job events
agenda.on('start', (job) => {
  console.log(`Job ${job.attrs.name} started`);
});

agenda.on('complete', (job) => {
  console.log(`Job ${job.attrs.name} completed`);
});

agenda.on('fail', (error, job) => {
  console.error(`Job ${job.attrs.name} failed:`, error);
});

agenda.on('success', (job) => {
  console.log(`Job ${job.attrs.name} succeeded`);
});
```

### Graceful Shutdown

```javascript
const agenda = new Agenda({ db: { address: 'mongodb://localhost/agenda' } });

async function gracefulShutdown() {
  await agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Building a Task Scheduler Service

```javascript
const cron = require('node-cron');

class TaskScheduler {
  constructor() {
    this.tasks = new Map();
  }
  
  addTask(name, schedule, handler) {
    if (this.tasks.has(name)) {
      throw new Error(`Task ${name} already exists`);
    }
    
    const task = cron.schedule(schedule, async () => {
      console.log(`[${new Date().toISOString()}] Running: ${name}`);
      try {
        await handler();
        console.log(`[${new Date().toISOString()}] Completed: ${name}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed: ${name}`, error);
      }
    }, { scheduled: false });
    
    this.tasks.set(name, task);
    return this;
  }
  
  start(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.start();
      console.log(`Started task: ${name}`);
    }
    return this;
  }
  
  startAll() {
    for (const [name, task] of this.tasks) {
      task.start();
      console.log(`Started task: ${name}`);
    }
    return this;
  }
  
  stop(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      console.log(`Stopped task: ${name}`);
    }
    return this;
  }
  
  stopAll() {
    for (const [name, task] of this.tasks) {
      task.stop();
    }
    console.log('All tasks stopped');
    return this;
  }
  
  remove(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
    }
    return this;
  }
}

// Usage
const scheduler = new TaskScheduler();

scheduler
  .addTask('cleanup', '0 0 * * *', async () => {
    await cleanupOldRecords();
  })
  .addTask('reports', '0 9 * * 1-5', async () => {
    await generateDailyReport();
  })
  .addTask('backup', '0 2 * * 0', async () => {
    await performWeeklyBackup();
  })
  .startAll();

// Graceful shutdown
process.on('SIGINT', () => {
  scheduler.stopAll();
  process.exit(0);
});
```

## Common Use Cases

### Database Cleanup

```javascript
const cron = require('node-cron');

// Clean old sessions every hour
cron.schedule('0 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await Session.deleteMany({ 
    lastAccess: { $lt: cutoff } 
  });
  console.log(`Cleaned ${result.deletedCount} old sessions`);
});
```

### Report Generation

```javascript
const cron = require('node-cron');

// Daily report at 6 AM
cron.schedule('0 6 * * *', async () => {
  const report = await generateReport();
  await sendEmail({
    to: 'team@company.com',
    subject: `Daily Report - ${new Date().toDateString()}`,
    html: report,
  });
});
```

### Cache Refresh

```javascript
const cron = require('node-cron');

let cachedData = null;

// Refresh cache every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  cachedData = await fetchFreshData();
  console.log('Cache refreshed');
});

// Use cached data
function getData() {
  return cachedData;
}
```

### Health Checks

```javascript
const cron = require('node-cron');

// Check service health every minute
cron.schedule('* * * * *', async () => {
  const services = ['api', 'database', 'cache'];
  
  for (const service of services) {
    const healthy = await checkHealth(service);
    if (!healthy) {
      await sendAlert(`${service} is unhealthy!`);
    }
  }
});
```

## Summary

| Library | Best For | Persistence |
|---------|----------|-------------|
| node-cron | Simple cron jobs | No |
| node-schedule | Date-based scheduling | No |
| Agenda | Complex jobs, persistence | MongoDB |
| Bull | Job queues with scheduling | Redis |

Best practices:
- Use try/catch in all scheduled handlers
- Log task execution for debugging
- Implement graceful shutdown
- Consider timezone differences
- Use unique names for jobs
- Monitor long-running tasks
- Use persistent storage (Agenda/Bull) for critical jobs
