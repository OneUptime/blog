# How to Set Up Job Priorities in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Job Priorities, Queue Management, Background Jobs

Description: A comprehensive guide to implementing job priorities in BullMQ, including priority queues, fair scheduling strategies, and practical patterns for handling mixed-priority workloads in production applications.

---

Job priorities allow you to control the order in which jobs are processed when multiple jobs are waiting in the queue. BullMQ supports priority-based processing where lower numbers indicate higher priority. This guide covers everything from basic priority setup to advanced fair scheduling patterns.

## Understanding BullMQ Priorities

In BullMQ, priorities are integers where:
- Lower numbers = Higher priority
- Priority 1 jobs are processed before priority 2 jobs
- Default priority is 0 (highest)
- Valid range is 0 to 2^21 - 1 (about 2 million)

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('tasks', { connection });

// High priority job (processed first)
await queue.add('urgent-task', { data: 'urgent' }, { priority: 1 });

// Normal priority job
await queue.add('normal-task', { data: 'normal' }, { priority: 5 });

// Low priority job (processed last)
await queue.add('background-task', { data: 'background' }, { priority: 10 });
```

## Defining Priority Levels

Create a type-safe priority system:

```typescript
// Priority levels as constants
export const PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 5,
  LOW: 10,
  BACKGROUND: 20,
} as const;

export type PriorityLevel = typeof PRIORITY[keyof typeof PRIORITY];

// Priority names for logging
export const PRIORITY_NAMES: Record<PriorityLevel, string> = {
  [PRIORITY.CRITICAL]: 'Critical',
  [PRIORITY.HIGH]: 'High',
  [PRIORITY.NORMAL]: 'Normal',
  [PRIORITY.LOW]: 'Low',
  [PRIORITY.BACKGROUND]: 'Background',
};

// Helper function to get priority
export function getPriorityLevel(name: keyof typeof PRIORITY): PriorityLevel {
  return PRIORITY[name];
}
```

## Basic Priority Queue Implementation

```typescript
interface TaskJobData {
  taskId: string;
  taskType: string;
  payload: Record<string, unknown>;
  userId: string;
}

class PriorityTaskQueue {
  private queue: Queue<TaskJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('priority-tasks', { connection });
  }

  // Add task with explicit priority
  async addTask(data: TaskJobData, priority: PriorityLevel) {
    return this.queue.add('process-task', data, { priority });
  }

  // Convenience methods for different priorities
  async addCriticalTask(data: TaskJobData) {
    return this.addTask(data, PRIORITY.CRITICAL);
  }

  async addHighPriorityTask(data: TaskJobData) {
    return this.addTask(data, PRIORITY.HIGH);
  }

  async addNormalTask(data: TaskJobData) {
    return this.addTask(data, PRIORITY.NORMAL);
  }

  async addLowPriorityTask(data: TaskJobData) {
    return this.addTask(data, PRIORITY.LOW);
  }

  async addBackgroundTask(data: TaskJobData) {
    return this.addTask(data, PRIORITY.BACKGROUND);
  }

  // Get queue statistics by priority
  async getStatsByPriority() {
    const waiting = await this.queue.getWaiting();
    const stats: Record<string, number> = {};

    for (const job of waiting) {
      const priority = job.opts.priority || 0;
      const priorityName = PRIORITY_NAMES[priority as PriorityLevel] || `Priority-${priority}`;
      stats[priorityName] = (stats[priorityName] || 0) + 1;
    }

    return stats;
  }
}
```

## Dynamic Priority Based on Context

Assign priorities based on job characteristics:

```typescript
interface EmailJobData {
  type: 'transactional' | 'marketing' | 'notification' | 'digest';
  recipient: string;
  subject: string;
  content: string;
  isVIP?: boolean;
}

class EmailPriorityQueue {
  private queue: Queue<EmailJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('emails', { connection });
  }

  async sendEmail(data: EmailJobData) {
    const priority = this.calculatePriority(data);
    return this.queue.add('send-email', data, { priority });
  }

  private calculatePriority(data: EmailJobData): number {
    // VIP users get highest priority
    if (data.isVIP) {
      return PRIORITY.CRITICAL;
    }

    // Priority based on email type
    switch (data.type) {
      case 'transactional':
        // Password resets, order confirmations, etc.
        return PRIORITY.HIGH;
      case 'notification':
        // Real-time notifications
        return PRIORITY.NORMAL;
      case 'marketing':
        // Marketing campaigns
        return PRIORITY.LOW;
      case 'digest':
        // Daily/weekly digests
        return PRIORITY.BACKGROUND;
      default:
        return PRIORITY.NORMAL;
    }
  }
}

// Usage
const emailQueue = new EmailPriorityQueue(connection);

// Transactional email - high priority
await emailQueue.sendEmail({
  type: 'transactional',
  recipient: 'user@example.com',
  subject: 'Password Reset',
  content: 'Click here to reset your password',
});

// Marketing email - low priority
await emailQueue.sendEmail({
  type: 'marketing',
  recipient: 'user@example.com',
  subject: 'Weekly Newsletter',
  content: 'Check out our latest updates',
});
```

## User-Based Priority

Implement tiered service based on user plan:

```typescript
interface UserContext {
  userId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  isActive: boolean;
}

interface ProcessingJobData {
  fileId: string;
  operation: string;
  user: UserContext;
}

class UserTieredQueue {
  private queue: Queue<ProcessingJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('processing', { connection });
  }

  async addProcessingJob(data: ProcessingJobData) {
    const priority = this.getUserPriority(data.user);
    return this.queue.add('process', data, { priority });
  }

  private getUserPriority(user: UserContext): number {
    // Priority based on subscription plan
    const planPriorities: Record<string, number> = {
      enterprise: PRIORITY.CRITICAL,
      pro: PRIORITY.HIGH,
      starter: PRIORITY.NORMAL,
      free: PRIORITY.LOW,
    };

    return planPriorities[user.plan] || PRIORITY.NORMAL;
  }
}

// More sophisticated priority calculation
class AdvancedUserPriorityQueue {
  private queue: Queue<ProcessingJobData>;
  private userJobCounts: Map<string, number> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('advanced-processing', { connection });
  }

  async addJob(data: ProcessingJobData) {
    const priority = this.calculateDynamicPriority(data);

    // Track job count per user
    const count = this.userJobCounts.get(data.user.userId) || 0;
    this.userJobCounts.set(data.user.userId, count + 1);

    return this.queue.add('process', data, { priority });
  }

  private calculateDynamicPriority(data: ProcessingJobData): number {
    let basePriority = this.getBasePriority(data.user.plan);

    // Penalize users who are submitting many jobs
    const jobCount = this.userJobCounts.get(data.user.userId) || 0;
    if (jobCount > 100) {
      basePriority += 5; // Lower priority for heavy users
    } else if (jobCount > 50) {
      basePriority += 2;
    }

    // Ensure priority stays within valid range
    return Math.min(basePriority, PRIORITY.BACKGROUND);
  }

  private getBasePriority(plan: string): number {
    const priorities: Record<string, number> = {
      enterprise: 1,
      pro: 3,
      starter: 5,
      free: 8,
    };
    return priorities[plan] || 5;
  }
}
```

## Fair Scheduling with Multiple Queues

For complex scenarios, use multiple queues with dedicated workers:

```typescript
class FairSchedulingService {
  private criticalQueue: Queue;
  private normalQueue: Queue;
  private backgroundQueue: Queue;

  constructor(connection: Redis) {
    this.criticalQueue = new Queue('critical-jobs', { connection });
    this.normalQueue = new Queue('normal-jobs', { connection });
    this.backgroundQueue = new Queue('background-jobs', { connection });
  }

  async addJob(data: TaskJobData, priority: PriorityLevel) {
    switch (priority) {
      case PRIORITY.CRITICAL:
      case PRIORITY.HIGH:
        return this.criticalQueue.add('task', data);
      case PRIORITY.NORMAL:
        return this.normalQueue.add('task', data);
      default:
        return this.backgroundQueue.add('task', data);
    }
  }

  createWorkers(connection: Redis, processor: (job: Job) => Promise<void>) {
    // Critical queue gets more workers
    const criticalWorker = new Worker('critical-jobs', processor, {
      connection,
      concurrency: 10,
    });

    // Normal queue gets moderate workers
    const normalWorker = new Worker('normal-jobs', processor, {
      connection,
      concurrency: 5,
    });

    // Background queue gets fewer workers
    const backgroundWorker = new Worker('background-jobs', processor, {
      connection,
      concurrency: 2,
    });

    return { criticalWorker, normalWorker, backgroundWorker };
  }
}
```

## Priority Aging (Preventing Starvation)

Implement priority aging to ensure low-priority jobs eventually get processed:

```typescript
interface AgingJobData {
  originalPriority: number;
  createdAt: number;
  data: Record<string, unknown>;
}

class PriorityAgingQueue {
  private queue: Queue<AgingJobData>;
  private readonly AGING_INTERVAL_MS = 60000; // 1 minute
  private readonly PRIORITY_BOOST = 1;

  constructor(connection: Redis) {
    this.queue = new Queue('aging-priority', { connection });
    this.startAgingProcess();
  }

  async addJob(data: Record<string, unknown>, priority: number) {
    const jobData: AgingJobData = {
      originalPriority: priority,
      createdAt: Date.now(),
      data,
    };
    return this.queue.add('task', jobData, { priority });
  }

  private startAgingProcess() {
    setInterval(async () => {
      await this.ageWaitingJobs();
    }, this.AGING_INTERVAL_MS);
  }

  private async ageWaitingJobs() {
    const waitingJobs = await this.queue.getWaiting();
    const now = Date.now();

    for (const job of waitingJobs) {
      const waitTime = now - job.data.createdAt;
      const waitMinutes = Math.floor(waitTime / 60000);

      // Boost priority by 1 for every 5 minutes waiting
      const priorityBoost = Math.floor(waitMinutes / 5) * this.PRIORITY_BOOST;
      const currentPriority = job.opts.priority || 0;
      const newPriority = Math.max(1, currentPriority - priorityBoost);

      if (newPriority < currentPriority) {
        // Remove and re-add with new priority
        const jobData = job.data;
        const jobName = job.name;
        await job.remove();
        await this.queue.add(jobName, jobData, { priority: newPriority });
      }
    }
  }
}
```

## Monitoring Priority Distribution

Track priority distribution in your queue:

```typescript
import { Job } from 'bullmq';

class PriorityMonitor {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async getPriorityDistribution() {
    const [waiting, active, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getDelayed(),
    ]);

    const distribution = {
      waiting: this.groupByPriority(waiting),
      active: this.groupByPriority(active),
      delayed: this.groupByPriority(delayed),
    };

    return distribution;
  }

  private groupByPriority(jobs: Job[]): Record<number, number> {
    return jobs.reduce((acc, job) => {
      const priority = job.opts.priority || 0;
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  async getAverageWaitTimeByPriority() {
    const completed = await this.queue.getCompleted(0, 1000);
    const waitTimes: Record<number, number[]> = {};

    for (const job of completed) {
      const priority = job.opts.priority || 0;
      const waitTime = (job.processedOn || 0) - job.timestamp;

      if (!waitTimes[priority]) {
        waitTimes[priority] = [];
      }
      waitTimes[priority].push(waitTime);
    }

    const averages: Record<number, number> = {};
    for (const [priority, times] of Object.entries(waitTimes)) {
      averages[Number(priority)] = times.reduce((a, b) => a + b, 0) / times.length;
    }

    return averages;
  }

  async logPriorityStats() {
    const distribution = await this.getPriorityDistribution();
    const avgWaitTimes = await this.getAverageWaitTimeByPriority();

    console.log('Priority Distribution:', JSON.stringify(distribution, null, 2));
    console.log('Average Wait Times (ms):', JSON.stringify(avgWaitTimes, null, 2));
  }
}
```

## Real-World Example: Support Ticket System

```typescript
interface TicketJobData {
  ticketId: string;
  customerId: string;
  customerPlan: 'free' | 'basic' | 'premium' | 'enterprise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  createdAt: string;
}

class SupportTicketQueue {
  private queue: Queue<TicketJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('support-tickets', { connection });
  }

  async addTicket(ticket: TicketJobData) {
    const priority = this.calculateTicketPriority(ticket);
    return this.queue.add('process-ticket', ticket, {
      priority,
      jobId: `ticket_${ticket.ticketId}`,
    });
  }

  private calculateTicketPriority(ticket: TicketJobData): number {
    // Base priority from customer plan
    const planPriority: Record<string, number> = {
      enterprise: 0,
      premium: 2,
      basic: 4,
      free: 6,
    };

    // Severity adjustment
    const severityAdjustment: Record<string, number> = {
      critical: -2,
      high: -1,
      medium: 0,
      low: 1,
    };

    let priority = planPriority[ticket.customerPlan] || 4;
    priority += severityAdjustment[ticket.severity] || 0;

    // Ensure priority is in valid range
    return Math.max(1, Math.min(priority, 20));
  }

  async escalateTicket(ticketId: string) {
    const job = await this.queue.getJob(`ticket_${ticketId}`);
    if (!job) {
      throw new Error('Ticket not found');
    }

    const currentPriority = job.opts.priority || 5;
    const newPriority = Math.max(1, currentPriority - 2);

    // Re-add with higher priority
    await job.remove();
    await this.queue.add('process-ticket', job.data, {
      priority: newPriority,
      jobId: `ticket_${ticketId}`,
    });

    console.log(`Escalated ticket ${ticketId} from priority ${currentPriority} to ${newPriority}`);
  }
}
```

## Best Practices

1. **Keep priority ranges reasonable** - Use a small set of well-defined priority levels rather than arbitrary numbers.

2. **Document your priority scheme** - Make it clear what each priority level means in your system.

3. **Implement priority aging** - Prevent low-priority job starvation by gradually increasing priority.

4. **Monitor priority distribution** - Track how jobs are distributed across priorities.

5. **Consider separate queues** - For vastly different priorities, separate queues may be cleaner.

6. **Be consistent** - Use the same priority calculation across all job types.

7. **Test under load** - Verify priority behavior when the queue is full.

8. **Log priority decisions** - Include priority in logs for debugging.

## Conclusion

Priority queues in BullMQ provide powerful control over job processing order. By implementing a well-designed priority system, you can ensure critical tasks are processed quickly while still handling lower-priority work efficiently. Remember to consider fair scheduling to prevent starvation and monitor your queue to verify priorities are working as expected.
