# How to Debug Failed Jobs in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Debugging, Error Handling, Troubleshooting, Stack Traces, Job Inspection

Description: A comprehensive guide to debugging failed jobs in BullMQ, including inspecting job data, analyzing stack traces, implementing logging strategies, using debugging tools, and building systematic approaches to troubleshoot job failures.

---

Failed jobs are inevitable in any queue system, but BullMQ provides excellent tools for debugging them. Understanding why jobs fail and how to fix them is crucial for maintaining reliable systems. This guide covers comprehensive strategies for debugging failed jobs in BullMQ.

## Understanding Job Failures

Jobs can fail for various reasons. BullMQ captures failure information:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('debug-queue', { connection });

// Inspect a failed job
async function inspectFailedJob(jobId: string) {
  const job = await queue.getJob(jobId);

  if (!job) {
    console.log('Job not found');
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    state,
    data: job.data,
    opts: job.opts,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    timestamps: {
      created: new Date(job.timestamp),
      processed: job.processedOn ? new Date(job.processedOn) : null,
      finished: job.finishedOn ? new Date(job.finishedOn) : null,
    },
    returnvalue: job.returnvalue,
  };
}

// Get all failed jobs
async function getAllFailedJobs() {
  const failed = await queue.getFailed();

  return failed.map((job) => ({
    id: job.id,
    name: job.name,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: new Date(job.timestamp),
    data: job.data,
  }));
}
```

## Structured Error Logging

Implement comprehensive error logging:

```typescript
interface JobError {
  jobId: string;
  jobName: string;
  queueName: string;
  error: {
    message: string;
    name: string;
    stack?: string;
    code?: string;
  };
  jobData: any;
  attemptsMade: number;
  timestamp: Date;
  context?: Record<string, any>;
}

class JobErrorLogger {
  private errors: JobError[] = [];

  logError(job: Job, error: Error, context?: Record<string, any>): void {
    const jobError: JobError = {
      jobId: job.id || 'unknown',
      jobName: job.name,
      queueName: job.queueName,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: (error as any).code,
      },
      jobData: this.sanitizeData(job.data),
      attemptsMade: job.attemptsMade,
      timestamp: new Date(),
      context,
    };

    this.errors.push(jobError);
    this.persistError(jobError);

    console.error('Job failed:', JSON.stringify(jobError, null, 2));
  }

  private sanitizeData(data: any): any {
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private persistError(error: JobError): void {
    // Implement persistence (database, file, external service)
    // Example: Send to logging service
  }

  getRecentErrors(count: number = 100): JobError[] {
    return this.errors.slice(-count);
  }

  getErrorsByJob(jobName: string): JobError[] {
    return this.errors.filter((e) => e.jobName === jobName);
  }

  getErrorPatterns(): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const error of this.errors) {
      const key = `${error.jobName}:${error.error.name}`;
      patterns.set(key, (patterns.get(key) || 0) + 1);
    }

    return patterns;
  }
}

const errorLogger = new JobErrorLogger();

// Worker with error logging
const worker = new Worker(
  'debug-queue',
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      errorLogger.logError(job, error as Error, {
        workerId: worker.id,
        hostname: process.env.HOSTNAME,
      });
      throw error;
    }
  },
  { connection }
);
```

## Stack Trace Analysis

Parse and analyze stack traces:

```typescript
interface ParsedStackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

class StackTraceAnalyzer {
  parseStackTrace(stack: string): ParsedStackFrame[] {
    const lines = stack.split('\n').slice(1); // Skip error message
    const frames: ParsedStackFrame[] = [];

    for (const line of lines) {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4]),
        });
      }
    }

    return frames;
  }

  findErrorOrigin(stack: string): ParsedStackFrame | null {
    const frames = this.parseStackTrace(stack);

    // Find first frame in application code (not node_modules)
    return frames.find((f) => !f.file.includes('node_modules')) || frames[0] || null;
  }

  groupByOrigin(errors: JobError[]): Map<string, JobError[]> {
    const groups = new Map<string, JobError[]>();

    for (const error of errors) {
      if (!error.error.stack) continue;

      const origin = this.findErrorOrigin(error.error.stack);
      if (!origin) continue;

      const key = `${origin.file}:${origin.line}`;
      const group = groups.get(key) || [];
      group.push(error);
      groups.set(key, group);
    }

    return groups;
  }
}

const stackAnalyzer = new StackTraceAnalyzer();
```

## Job Data Inspector

Inspect and validate job data:

```typescript
class JobDataInspector {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async inspectJob(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const logs = await job.log('');

    return {
      basic: {
        id: job.id,
        name: job.name,
        state,
        priority: job.opts.priority,
      },
      data: {
        payload: job.data,
        dataSize: JSON.stringify(job.data).length,
        dataKeys: Object.keys(job.data),
      },
      timing: {
        created: new Date(job.timestamp),
        delay: job.opts.delay,
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        processingTime: job.processedOn && job.finishedOn
          ? job.finishedOn - job.processedOn
          : null,
      },
      attempts: {
        made: job.attemptsMade,
        max: job.opts.attempts,
        backoff: job.opts.backoff,
      },
      failure: state === 'failed' ? {
        reason: job.failedReason,
        stacktrace: job.stacktrace,
      } : null,
      result: job.returnvalue,
      logs: logs,
    };
  }

  async compareJobs(successId: string, failedId: string): Promise<any> {
    const [success, failed] = await Promise.all([
      this.inspectJob(successId),
      this.inspectJob(failedId),
    ]);

    if (!success || !failed) {
      return { error: 'One or both jobs not found' };
    }

    // Find differences in data
    const dataDiff = this.findDifferences(success.data.payload, failed.data.payload);

    return {
      success: success.basic,
      failed: failed.basic,
      dataDifferences: dataDiff,
      timingComparison: {
        successProcessingTime: success.timing.processingTime,
        failedProcessingTime: failed.timing.processingTime,
      },
    };
  }

  private findDifferences(obj1: any, obj2: any, path = ''): any[] {
    const diffs: any[] = [];

    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of keys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (typeof val1 === 'object' && typeof val2 === 'object') {
        diffs.push(...this.findDifferences(val1, val2, currentPath));
      } else if (val1 !== val2) {
        diffs.push({
          path: currentPath,
          success: val1,
          failed: val2,
        });
      }
    }

    return diffs;
  }
}
```

## Debug Mode Worker

Create a worker with enhanced debugging:

```typescript
interface DebugOptions {
  logInput: boolean;
  logOutput: boolean;
  logTiming: boolean;
  breakOnError: boolean;
  traceExecution: boolean;
}

class DebugWorker {
  private worker: Worker;
  private debugOptions: DebugOptions;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    connection: Redis,
    debugOptions: Partial<DebugOptions> = {}
  ) {
    this.debugOptions = {
      logInput: true,
      logOutput: true,
      logTiming: true,
      breakOnError: false,
      traceExecution: false,
      ...debugOptions,
    };

    this.worker = new Worker(
      queueName,
      async (job) => this.wrappedProcessor(job, processor),
      { connection }
    );
  }

  private async wrappedProcessor(
    job: Job,
    processor: (job: Job) => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    const debugId = `${job.id}-${Date.now()}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[DEBUG ${debugId}] Starting job: ${job.name} (${job.id})`);
    console.log(`${'='.repeat(60)}`);

    if (this.debugOptions.logInput) {
      console.log('\n[INPUT]');
      console.log(JSON.stringify(job.data, null, 2));
    }

    try {
      if (this.debugOptions.traceExecution) {
        // Add execution tracing
        const originalLog = console.log;
        console.log = (...args) => {
          originalLog(`[TRACE ${debugId}]`, ...args);
        };
      }

      const result = await processor(job);

      if (this.debugOptions.logTiming) {
        console.log(`\n[TIMING] Completed in ${Date.now() - startTime}ms`);
      }

      if (this.debugOptions.logOutput) {
        console.log('\n[OUTPUT]');
        console.log(JSON.stringify(result, null, 2));
      }

      console.log(`\n[DEBUG ${debugId}] Job completed successfully`);
      return result;
    } catch (error) {
      console.error(`\n[ERROR ${debugId}]`);
      console.error('Message:', (error as Error).message);
      console.error('Stack:', (error as Error).stack);

      if (this.debugOptions.logTiming) {
        console.log(`[TIMING] Failed after ${Date.now() - startTime}ms`);
      }

      if (this.debugOptions.breakOnError) {
        console.log('\n[DEBUG] Break on error enabled. Inspect state and press Enter to continue...');
        await this.waitForInput();
      }

      throw error;
    }
  }

  private waitForInput(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  }
}
```

## Failed Job Dashboard

Create an API for debugging:

```typescript
import express from 'express';

function createDebugRouter(queue: Queue): express.Router {
  const router = express.Router();
  const inspector = new JobDataInspector(queue);

  // Get failed jobs with pagination
  router.get('/failed', async (req, res) => {
    try {
      const start = parseInt(req.query.start as string) || 0;
      const end = parseInt(req.query.end as string) || 49;

      const failed = await queue.getFailed(start, end);
      const total = await queue.getFailedCount();

      res.json({
        jobs: failed.map((job) => ({
          id: job.id,
          name: job.name,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        })),
        pagination: {
          start,
          end,
          total,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get detailed job info
  router.get('/jobs/:jobId', async (req, res) => {
    try {
      const details = await inspector.inspectJob(req.params.jobId);
      if (!details) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get stack trace analysis
  router.get('/jobs/:jobId/stacktrace', async (req, res) => {
    try {
      const job = await queue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const stacktrace = job.stacktrace;
      if (!stacktrace || stacktrace.length === 0) {
        return res.json({ stacktrace: null, parsed: null });
      }

      const analyzer = new StackTraceAnalyzer();
      const parsed = analyzer.parseStackTrace(stacktrace[stacktrace.length - 1]);
      const origin = analyzer.findErrorOrigin(stacktrace[stacktrace.length - 1]);

      res.json({
        raw: stacktrace,
        parsed,
        origin,
        attemptCount: stacktrace.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Retry a specific job
  router.post('/jobs/:jobId/retry', async (req, res) => {
    try {
      const job = await queue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const state = await job.getState();
      if (state !== 'failed') {
        return res.status(400).json({ error: `Job is ${state}, not failed` });
      }

      await job.retry();
      res.json({ success: true, message: 'Job queued for retry' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Retry all failed jobs
  router.post('/failed/retry-all', async (req, res) => {
    try {
      const failed = await queue.getFailed();
      let retried = 0;

      for (const job of failed) {
        await job.retry();
        retried++;
      }

      res.json({ success: true, retriedCount: retried });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get error patterns
  router.get('/patterns', async (req, res) => {
    try {
      const failed = await queue.getFailed();
      const patterns: Record<string, { count: number; examples: any[] }> = {};

      for (const job of failed) {
        const errorType = job.failedReason?.split(':')[0] || 'Unknown';
        if (!patterns[errorType]) {
          patterns[errorType] = { count: 0, examples: [] };
        }
        patterns[errorType].count++;
        if (patterns[errorType].examples.length < 3) {
          patterns[errorType].examples.push({
            id: job.id,
            name: job.name,
            reason: job.failedReason,
          });
        }
      }

      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Compare successful and failed jobs
  router.get('/compare', async (req, res) => {
    try {
      const { successId, failedId } = req.query;
      if (!successId || !failedId) {
        return res.status(400).json({ error: 'Both successId and failedId required' });
      }

      const comparison = await inspector.compareJobs(
        successId as string,
        failedId as string
      );

      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
```

## Replay Failed Jobs with Modifications

Replay jobs with data modifications for testing:

```typescript
class JobReplayer {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async replayJob(
    jobId: string,
    modifications?: Partial<{ data: any; opts: any }>
  ): Promise<Job> {
    const originalJob = await this.queue.getJob(jobId);
    if (!originalJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const newData = modifications?.data
      ? { ...originalJob.data, ...modifications.data }
      : originalJob.data;

    const newOpts = {
      ...originalJob.opts,
      ...modifications?.opts,
      jobId: undefined, // Let BullMQ generate a new ID
    };

    const newJob = await this.queue.add(
      `replay_${originalJob.name}`,
      newData,
      newOpts
    );

    console.log(`Replayed job ${jobId} as ${newJob.id}`);
    return newJob;
  }

  async replayWithDryRun(
    jobId: string,
    processor: (job: Job) => Promise<any>
  ): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log('Dry run - simulating job processing');
    console.log('Job data:', JSON.stringify(job.data, null, 2));

    try {
      // Create a mock job object
      const mockJob = {
        ...job,
        updateProgress: async (progress: number) => {
          console.log(`[DRY RUN] Progress: ${progress}`);
        },
        log: async (message: string) => {
          console.log(`[DRY RUN] Log: ${message}`);
        },
      };

      const result = await processor(mockJob as Job);
      console.log('Dry run result:', JSON.stringify(result, null, 2));
      return { success: true, result };
    } catch (error) {
      console.error('Dry run failed:', (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }
}
```

## Automated Failure Analysis

Automatically analyze and categorize failures:

```typescript
interface FailureAnalysis {
  category: string;
  likelihood: number;
  suggestedFix: string;
  relatedJobs: string[];
}

class FailureAnalyzer {
  private patterns: Map<RegExp, { category: string; suggestedFix: string }> = new Map([
    [/ECONNREFUSED/, {
      category: 'Connection Error',
      suggestedFix: 'Check if the external service is running and accessible',
    }],
    [/ETIMEDOUT/, {
      category: 'Timeout',
      suggestedFix: 'Increase timeout or check network connectivity',
    }],
    [/ENOMEM|out of memory/i, {
      category: 'Memory Error',
      suggestedFix: 'Reduce job data size or increase worker memory',
    }],
    [/validation|invalid|schema/i, {
      category: 'Validation Error',
      suggestedFix: 'Check job data format and required fields',
    }],
    [/unauthorized|401|forbidden|403/i, {
      category: 'Authentication Error',
      suggestedFix: 'Check API keys and credentials',
    }],
    [/rate limit|429|too many requests/i, {
      category: 'Rate Limiting',
      suggestedFix: 'Implement rate limiting or retry with backoff',
    }],
    [/not found|404/i, {
      category: 'Resource Not Found',
      suggestedFix: 'Verify the resource exists before processing',
    }],
  ]);

  analyzeFailure(job: Job): FailureAnalysis {
    const reason = job.failedReason || '';
    const stack = job.stacktrace?.join('\n') || '';
    const combined = `${reason}\n${stack}`;

    for (const [pattern, info] of this.patterns) {
      if (pattern.test(combined)) {
        return {
          category: info.category,
          likelihood: 0.9,
          suggestedFix: info.suggestedFix,
          relatedJobs: [],
        };
      }
    }

    return {
      category: 'Unknown',
      likelihood: 0.5,
      suggestedFix: 'Review the stack trace and job data for clues',
      relatedJobs: [],
    };
  }

  async analyzeAllFailures(queue: Queue): Promise<Map<string, FailureAnalysis[]>> {
    const failed = await queue.getFailed();
    const analyses = new Map<string, FailureAnalysis[]>();

    for (const job of failed) {
      const analysis = this.analyzeFailure(job);
      const existing = analyses.get(analysis.category) || [];
      existing.push({ ...analysis, relatedJobs: [job.id!] });
      analyses.set(analysis.category, existing);
    }

    // Merge related jobs
    for (const [category, items] of analyses) {
      const merged: FailureAnalysis = {
        category,
        likelihood: items[0].likelihood,
        suggestedFix: items[0].suggestedFix,
        relatedJobs: items.flatMap((i) => i.relatedJobs),
      };
      analyses.set(category, [merged]);
    }

    return analyses;
  }
}
```

## Best Practices

1. **Log comprehensively** - Include job ID, data, and context in logs.

2. **Preserve stack traces** - Configure BullMQ to keep full stack traces.

3. **Use job logs** - Call `job.log()` at key points in processing.

4. **Implement dry runs** - Test job processing without side effects.

5. **Compare with successful jobs** - Find differences that cause failures.

6. **Categorize errors** - Group similar failures for batch fixes.

7. **Set up alerting** - Get notified of failure spikes quickly.

8. **Review regularly** - Analyze failure patterns periodically.

9. **Document common issues** - Build a knowledge base of fixes.

10. **Test fixes before retry** - Use dry runs to verify fixes work.

## Conclusion

Debugging failed jobs in BullMQ requires a systematic approach. By implementing comprehensive logging, stack trace analysis, job inspection tools, and automated failure analysis, you can quickly identify and resolve issues. Remember to build debugging tools that help you understand patterns across failures, not just individual job issues.
