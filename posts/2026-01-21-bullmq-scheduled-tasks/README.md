# How to Build a Scheduled Task System with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Scheduled Tasks, Cron Jobs, Task Scheduling, Background Jobs, Automation

Description: A comprehensive guide to building a scheduled task system with BullMQ, including cron-like scheduling, one-time delayed tasks, recurring jobs, task management, and building a flexible task scheduler.

---

Scheduled tasks are essential for automating background operations like reports, cleanups, notifications, and data synchronization. BullMQ's repeatable jobs feature provides a powerful foundation for building a flexible task scheduling system. This guide covers building a complete scheduled task system.

## Basic Scheduled Tasks

Create simple scheduled tasks:

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

interface ScheduledTaskData {
  taskType: string;
  params: Record<string, any>;
  scheduledBy?: string;
}

const schedulerQueue = new Queue<ScheduledTaskData>('scheduled-tasks', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
});

// Add a one-time delayed task
await schedulerQueue.add(
  'send-reminder',
  { taskType: 'reminder', params: { userId: '123', message: 'Hello!' } },
  { delay: 3600000 } // 1 hour from now
);

// Add a recurring task (every hour)
await schedulerQueue.add(
  'hourly-cleanup',
  { taskType: 'cleanup', params: { type: 'temp-files' } },
  {
    repeat: {
      pattern: '0 * * * *', // Every hour at minute 0
    },
    jobId: 'hourly-cleanup', // Unique ID for this repeatable job
  }
);

// Add a daily task
await schedulerQueue.add(
  'daily-report',
  { taskType: 'report', params: { reportType: 'daily-summary' } },
  {
    repeat: {
      pattern: '0 9 * * *', // Every day at 9 AM
      tz: 'America/New_York',
    },
    jobId: 'daily-report',
  }
);

// Task worker
const taskWorker = new Worker<ScheduledTaskData>(
  'scheduled-tasks',
  async (job) => {
    const { taskType, params } = job.data;

    await job.log(`Executing task: ${taskType}`);

    switch (taskType) {
      case 'reminder':
        await sendReminder(params);
        break;
      case 'cleanup':
        await performCleanup(params);
        break;
      case 'report':
        await generateReport(params);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    return { executed: true, taskType };
  },
  { connection, concurrency: 5 }
);

async function sendReminder(params: any): Promise<void> {
  // Implementation
}

async function performCleanup(params: any): Promise<void> {
  // Implementation
}

async function generateReport(params: any): Promise<void> {
  // Implementation
}
```

## Task Scheduler Service

Create a complete task scheduler service:

```typescript
interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  taskType: string;
  params: Record<string, any>;
  schedule: {
    type: 'once' | 'recurring';
    runAt?: Date; // For one-time tasks
    pattern?: string; // Cron pattern for recurring
    timezone?: string;
  };
  enabled: boolean;
  createdBy?: string;
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

class TaskSchedulerService {
  private queue: Queue<ScheduledTaskData>;
  private tasks: Map<string, TaskDefinition> = new Map();
  private redis: Redis;

  constructor(connection: Redis) {
    this.redis = connection;
    this.queue = new Queue('scheduled-tasks', { connection });
  }

  async registerTask(task: Omit<TaskDefinition, 'createdAt'>): Promise<TaskDefinition> {
    const taskDef: TaskDefinition = {
      ...task,
      createdAt: new Date(),
    };

    if (task.enabled) {
      await this.scheduleTask(taskDef);
    }

    this.tasks.set(task.id, taskDef);
    await this.persistTask(taskDef);

    return taskDef;
  }

  private async scheduleTask(task: TaskDefinition): Promise<void> {
    const jobData: ScheduledTaskData = {
      taskType: task.taskType,
      params: task.params,
      scheduledBy: task.createdBy,
    };

    if (task.schedule.type === 'once' && task.schedule.runAt) {
      const delay = task.schedule.runAt.getTime() - Date.now();

      if (delay > 0) {
        await this.queue.add(task.name, jobData, {
          delay,
          jobId: `task_${task.id}`,
        });

        task.nextRunAt = task.schedule.runAt;
      }
    } else if (task.schedule.type === 'recurring' && task.schedule.pattern) {
      await this.queue.add(task.name, jobData, {
        repeat: {
          pattern: task.schedule.pattern,
          tz: task.schedule.timezone,
        },
        jobId: `task_${task.id}`,
      });

      // Calculate next run time
      task.nextRunAt = this.getNextRunTime(task.schedule.pattern, task.schedule.timezone);
    }
  }

  async unscheduleTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Remove the job
    const job = await this.queue.getJob(`task_${taskId}`);
    if (job) {
      await job.remove();
    }

    // Remove repeatable job if exists
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const repeatable = repeatableJobs.find((j) => j.id === `task_${taskId}`);
    if (repeatable) {
      await this.queue.removeRepeatableByKey(repeatable.key);
    }

    task.enabled = false;
    await this.persistTask(task);
  }

  async enableTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.enabled = true;
    await this.scheduleTask(task);
    await this.persistTask(task);
  }

  async disableTask(taskId: string): Promise<void> {
    await this.unscheduleTask(taskId);
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskDefinition>
  ): Promise<TaskDefinition> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Unschedule current task
    if (task.enabled) {
      await this.unscheduleTask(taskId);
    }

    // Apply updates
    Object.assign(task, updates);

    // Reschedule if enabled
    if (task.enabled) {
      await this.scheduleTask(task);
    }

    await this.persistTask(task);

    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.unscheduleTask(taskId);
    this.tasks.delete(taskId);
    await this.redis.del(`task:${taskId}`);
  }

  async getAllTasks(): Promise<TaskDefinition[]> {
    return Array.from(this.tasks.values());
  }

  async getTaskStatus(taskId: string): Promise<{
    task: TaskDefinition;
    lastRun?: any;
    nextRun?: Date;
    isRunning: boolean;
  } | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const activeJobs = await this.queue.getActive();
    const isRunning = activeJobs.some((j) => j.id === `task_${taskId}`);

    return {
      task,
      lastRun: task.lastRunAt,
      nextRun: task.nextRunAt,
      isRunning,
    };
  }

  async runTaskNow(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    await this.queue.add(
      `${task.name}_manual`,
      {
        taskType: task.taskType,
        params: task.params,
        scheduledBy: 'manual',
      },
      {
        jobId: `task_${taskId}_manual_${Date.now()}`,
      }
    );
  }

  private async persistTask(task: TaskDefinition): Promise<void> {
    await this.redis.set(
      `task:${task.id}`,
      JSON.stringify(task),
      'EX',
      86400 * 365 // Keep for 1 year
    );
  }

  private getNextRunTime(pattern: string, timezone?: string): Date {
    // Would use a cron parser library like 'cron-parser'
    return new Date();
  }

  async loadTasks(): Promise<void> {
    const keys = await this.redis.keys('task:*');

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const task = JSON.parse(data) as TaskDefinition;
        this.tasks.set(task.id, task);

        if (task.enabled) {
          await this.scheduleTask(task);
        }
      }
    }
  }
}
```

## Task Execution Tracking

Track task execution history:

```typescript
interface TaskExecution {
  executionId: string;
  taskId: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

class TaskExecutionTracker {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async recordStart(taskId: string, taskName: string): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const execution: TaskExecution = {
      executionId,
      taskId,
      taskName,
      startTime: new Date(),
      status: 'running',
    };

    await this.redis.hset(
      `task:${taskId}:executions`,
      executionId,
      JSON.stringify(execution)
    );

    await this.redis.set(
      `task:${taskId}:current`,
      executionId,
      'EX',
      3600 // 1 hour timeout
    );

    return executionId;
  }

  async recordComplete(
    taskId: string,
    executionId: string,
    result: any
  ): Promise<void> {
    const key = `task:${taskId}:executions`;
    const data = await this.redis.hget(key, executionId);

    if (data) {
      const execution = JSON.parse(data) as TaskExecution;
      execution.endTime = new Date();
      execution.status = 'completed';
      execution.result = result;
      execution.duration = execution.endTime.getTime() - new Date(execution.startTime).getTime();

      await this.redis.hset(key, executionId, JSON.stringify(execution));
    }

    await this.redis.del(`task:${taskId}:current`);
  }

  async recordFailure(
    taskId: string,
    executionId: string,
    error: Error
  ): Promise<void> {
    const key = `task:${taskId}:executions`;
    const data = await this.redis.hget(key, executionId);

    if (data) {
      const execution = JSON.parse(data) as TaskExecution;
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = error.message;
      execution.duration = execution.endTime.getTime() - new Date(execution.startTime).getTime();

      await this.redis.hset(key, executionId, JSON.stringify(execution));
    }

    await this.redis.del(`task:${taskId}:current`);
  }

  async getExecutionHistory(
    taskId: string,
    limit: number = 100
  ): Promise<TaskExecution[]> {
    const data = await this.redis.hgetall(`task:${taskId}:executions`);

    const executions = Object.values(data)
      .map((d) => JSON.parse(d) as TaskExecution)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);

    return executions;
  }

  async getLastExecution(taskId: string): Promise<TaskExecution | null> {
    const history = await this.getExecutionHistory(taskId, 1);
    return history[0] || null;
  }

  async isTaskRunning(taskId: string): Promise<boolean> {
    const current = await this.redis.get(`task:${taskId}:current`);
    return current !== null;
  }
}

// Integrate with worker
const tracker = new TaskExecutionTracker(connection);

const trackedWorker = new Worker<ScheduledTaskData>(
  'scheduled-tasks',
  async (job) => {
    const taskId = job.opts.jobId?.replace('task_', '') || job.id!;
    const executionId = await tracker.recordStart(taskId, job.name);

    try {
      const result = await executeTask(job.data);
      await tracker.recordComplete(taskId, executionId, result);
      return result;
    } catch (error) {
      await tracker.recordFailure(taskId, executionId, error as Error);
      throw error;
    }
  },
  { connection }
);

async function executeTask(data: ScheduledTaskData): Promise<any> {
  // Task execution logic
  return { executed: true };
}
```

## Task Dependencies

Implement tasks that depend on other tasks:

```typescript
interface DependentTask extends TaskDefinition {
  dependencies: string[]; // IDs of tasks that must complete first
  dependencyMode: 'all' | 'any'; // All must complete or any one
}

class DependentTaskScheduler {
  private scheduler: TaskSchedulerService;
  private dependentTasks: Map<string, DependentTask> = new Map();
  private completedTasks: Set<string> = new Set();

  constructor(scheduler: TaskSchedulerService) {
    this.scheduler = scheduler;
  }

  async registerDependentTask(task: DependentTask): Promise<void> {
    this.dependentTasks.set(task.id, task);

    // Don't schedule yet - wait for dependencies
    task.enabled = false;
    await this.scheduler.registerTask(task);
  }

  async onTaskComplete(taskId: string): Promise<void> {
    this.completedTasks.add(taskId);

    // Check if any dependent tasks can now run
    for (const [id, task] of this.dependentTasks) {
      if (this.canRun(task)) {
        await this.scheduler.runTaskNow(id);
      }
    }
  }

  private canRun(task: DependentTask): boolean {
    if (task.dependencyMode === 'all') {
      return task.dependencies.every((dep) => this.completedTasks.has(dep));
    } else {
      return task.dependencies.some((dep) => this.completedTasks.has(dep));
    }
  }

  resetCompletedTasks(): void {
    this.completedTasks.clear();
  }
}
```

## Task Groups and Workflows

Create task groups for complex workflows:

```typescript
interface TaskGroup {
  id: string;
  name: string;
  tasks: Array<{
    taskId: string;
    order: number; // Execution order
    parallel: boolean; // Can run in parallel with same order
  }>;
  schedule: {
    pattern: string;
    timezone?: string;
  };
}

class TaskGroupScheduler {
  private queue: Queue;
  private groups: Map<string, TaskGroup> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('task-groups', { connection });

    new Worker(
      'task-groups',
      async (job) => this.executeGroup(job),
      { connection }
    );
  }

  async registerGroup(group: TaskGroup): Promise<void> {
    this.groups.set(group.id, group);

    await this.queue.add(
      group.name,
      { groupId: group.id },
      {
        repeat: {
          pattern: group.schedule.pattern,
          tz: group.schedule.timezone,
        },
        jobId: `group_${group.id}`,
      }
    );
  }

  private async executeGroup(job: Job): Promise<any> {
    const group = this.groups.get(job.data.groupId);
    if (!group) throw new Error(`Group ${job.data.groupId} not found`);

    await job.log(`Executing task group: ${group.name}`);

    const results: Record<string, any> = {};

    // Group tasks by order
    const tasksByOrder = new Map<number, typeof group.tasks>();
    for (const task of group.tasks) {
      if (!tasksByOrder.has(task.order)) {
        tasksByOrder.set(task.order, []);
      }
      tasksByOrder.get(task.order)!.push(task);
    }

    // Execute in order
    const orders = Array.from(tasksByOrder.keys()).sort((a, b) => a - b);

    for (const order of orders) {
      const tasks = tasksByOrder.get(order)!;

      await job.log(`Executing order ${order}: ${tasks.length} tasks`);

      // Execute parallel tasks concurrently
      const parallelTasks = tasks.filter((t) => t.parallel);
      const sequentialTasks = tasks.filter((t) => !t.parallel);

      // Run parallel tasks
      if (parallelTasks.length > 0) {
        const parallelResults = await Promise.all(
          parallelTasks.map((t) => this.executeTask(t.taskId))
        );

        parallelTasks.forEach((t, i) => {
          results[t.taskId] = parallelResults[i];
        });
      }

      // Run sequential tasks
      for (const task of sequentialTasks) {
        results[task.taskId] = await this.executeTask(task.taskId);
      }
    }

    return results;
  }

  private async executeTask(taskId: string): Promise<any> {
    // Execute individual task
    return { taskId, executed: true };
  }
}
```

## Task API Endpoints

Create API endpoints for task management:

```typescript
import express from 'express';

function createTaskRouter(scheduler: TaskSchedulerService): express.Router {
  const router = express.Router();

  // List all tasks
  router.get('/tasks', async (req, res) => {
    try {
      const tasks = await scheduler.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Create task
  router.post('/tasks', async (req, res) => {
    try {
      const task = await scheduler.registerTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get task status
  router.get('/tasks/:id', async (req, res) => {
    try {
      const status = await scheduler.getTaskStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Update task
  router.put('/tasks/:id', async (req, res) => {
    try {
      const task = await scheduler.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete task
  router.delete('/tasks/:id', async (req, res) => {
    try {
      await scheduler.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Enable task
  router.post('/tasks/:id/enable', async (req, res) => {
    try {
      await scheduler.enableTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Disable task
  router.post('/tasks/:id/disable', async (req, res) => {
    try {
      await scheduler.disableTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Run task now
  router.post('/tasks/:id/run', async (req, res) => {
    try {
      await scheduler.runTaskNow(req.params.id);
      res.json({ success: true, message: 'Task queued for immediate execution' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
```

## Best Practices

1. **Use unique job IDs** - Prevent duplicate scheduled jobs.

2. **Handle timezone properly** - Use timezone option for cron patterns.

3. **Track execution history** - Keep records of past runs.

4. **Implement graceful shutdown** - Complete running tasks before stopping.

5. **Use distributed locking** - Prevent duplicate execution in clusters.

6. **Monitor task health** - Alert on failures and missed schedules.

7. **Support manual triggers** - Allow running tasks on demand.

8. **Validate cron patterns** - Check patterns before scheduling.

9. **Handle clock drift** - Use server time or NTP sync.

10. **Plan for restarts** - Reload scheduled tasks on application start.

## Conclusion

BullMQ's repeatable jobs feature provides a solid foundation for building a scheduled task system. By implementing proper task management, execution tracking, and API endpoints, you can create a flexible scheduler that handles both simple recurring tasks and complex workflows. Remember to handle edge cases like task failures, overlapping executions, and system restarts.
