# How to Monitor BullMQ with Bull Board

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Bull Board, Monitoring, Dashboard, Queue Management, Real-Time

Description: A comprehensive guide to setting up Bull Board for monitoring BullMQ queues, including dashboard configuration, queue visualization, job management, and integrating with Express, Fastify, and other frameworks.

---

Bull Board provides a beautiful, real-time dashboard for monitoring and managing BullMQ queues. It allows you to visualize queue status, inspect jobs, retry failed jobs, and understand your queue performance at a glance. This guide covers setting up and customizing Bull Board.

## Installing Bull Board

Install the required packages:

```bash
npm install @bull-board/api @bull-board/express bullmq
# Or for Fastify
npm install @bull-board/api @bull-board/fastify bullmq
```

## Basic Setup with Express

Set up Bull Board with an Express application:

```typescript
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create your queues
const emailQueue = new Queue('emails', { connection });
const orderQueue = new Queue('orders', { connection });
const notificationQueue = new Queue('notifications', { connection });

// Create Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(orderQueue),
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter,
});

const app = express();

// Mount Bull Board
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Bull Board available at http://localhost:3000/admin/queues');
});
```

## Setup with Fastify

Integrate Bull Board with Fastify:

```typescript
import Fastify from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue('emails', { connection });
const orderQueue = new Queue('orders', { connection });

async function start() {
  const fastify = Fastify({ logger: true });

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(orderQueue),
    ],
    serverAdapter,
  });

  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
    basePath: '/admin/queues',
  });

  await fastify.listen({ port: 3000 });
  console.log('Bull Board available at http://localhost:3000/admin/queues');
}

start();
```

## Dynamic Queue Registration

Add and remove queues dynamically:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';

class DynamicBullBoard {
  private queues: Map<string, Queue> = new Map();
  private adapters: Map<string, BullMQAdapter> = new Map();
  private board: ReturnType<typeof createBullBoard>;
  private serverAdapter: ExpressAdapter;

  constructor(connection: Redis) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    this.board = createBullBoard({
      queues: [],
      serverAdapter: this.serverAdapter,
    });
  }

  addQueue(name: string): void {
    if (this.queues.has(name)) {
      console.log(`Queue ${name} already registered`);
      return;
    }

    const queue = new Queue(name, { connection });
    const adapter = new BullMQAdapter(queue);

    this.queues.set(name, queue);
    this.adapters.set(name, adapter);
    this.board.addQueue(adapter);

    console.log(`Queue ${name} added to Bull Board`);
  }

  removeQueue(name: string): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      this.board.removeQueue(adapter);
      this.adapters.delete(name);
    }

    const queue = this.queues.get(name);
    if (queue) {
      queue.close();
      this.queues.delete(name);
    }

    console.log(`Queue ${name} removed from Bull Board`);
  }

  replaceQueues(names: string[]): void {
    // Close existing queues
    for (const queue of this.queues.values()) {
      queue.close();
    }
    this.queues.clear();
    this.adapters.clear();

    // Create new queues
    const newAdapters = names.map((name) => {
      const queue = new Queue(name, { connection });
      const adapter = new BullMQAdapter(queue);
      this.queues.set(name, queue);
      this.adapters.set(name, adapter);
      return adapter;
    });

    this.board.replaceQueues(newAdapters);
  }

  getRouter() {
    return this.serverAdapter.getRouter();
  }
}

// Usage
const dynamicBoard = new DynamicBullBoard(connection);
dynamicBoard.addQueue('emails');
dynamicBoard.addQueue('orders');

app.use('/admin/queues', dynamicBoard.getRouter());

// Later, add more queues
dynamicBoard.addQueue('notifications');
```

## Authentication and Authorization

Protect Bull Board with authentication:

```typescript
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

const app = express();

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Simple authentication
passport.use(new LocalStrategy((username, password, done) => {
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    return done(null, { id: 1, username: 'admin', role: 'admin' });
  }
  return done(null, false);
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id: number, done) => {
  done(null, { id: 1, username: 'admin', role: 'admin' });
});

// Login route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/admin/queues',
  failureRedirect: '/login',
}));

// Authentication middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Protect Bull Board
app.use('/admin/queues', requireAuth, serverAdapter.getRouter());
```

## Basic Auth Protection

Simple HTTP Basic Authentication:

```typescript
import basicAuth from 'express-basic-auth';

// Basic auth middleware
const authMiddleware = basicAuth({
  users: {
    admin: process.env.BULL_BOARD_PASSWORD || 'secret',
  },
  challenge: true,
  realm: 'Bull Board Admin',
});

// Protect Bull Board
app.use('/admin/queues', authMiddleware, serverAdapter.getRouter());
```

## Read-Only Mode

Configure Bull Board for read-only access:

```typescript
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue, { readOnlyMode: true }),
    new BullMQAdapter(orderQueue, { readOnlyMode: true }),
  ],
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'Production Queues (Read Only)',
      boardLogo: {
        path: '/logo.png',
        width: '100px',
        height: '50px',
      },
    },
  },
});
```

## Role-Based Access

Different access levels for different users:

```typescript
class RoleBasedBullBoard {
  private serverAdapter: ExpressAdapter;
  private readOnlyAdapter: ExpressAdapter;

  constructor(queues: Queue[], connection: Redis) {
    // Full access board
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: queues.map(q => new BullMQAdapter(q)),
      serverAdapter: this.serverAdapter,
    });

    // Read-only board
    this.readOnlyAdapter = new ExpressAdapter();
    this.readOnlyAdapter.setBasePath('/view/queues');

    createBullBoard({
      queues: queues.map(q => new BullMQAdapter(q, { readOnlyMode: true })),
      serverAdapter: this.readOnlyAdapter,
    });
  }

  setupRoutes(app: express.Application) {
    // Admin route - full access
    app.use('/admin/queues', this.requireRole('admin'), this.serverAdapter.getRouter());

    // Viewer route - read only
    app.use('/view/queues', this.requireRole('viewer'), this.readOnlyAdapter.getRouter());
  }

  private requireRole(role: string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (role === 'viewer' || user.role === 'admin') {
        return next();
      }

      if (user.role === role) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden' });
    };
  }
}
```

## Custom UI Configuration

Customize the Bull Board appearance:

```typescript
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(orderQueue),
  ],
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'My Application Queues',
      boardLogo: {
        path: 'https://example.com/logo.png',
        width: '200px',
        height: 'auto',
      },
      miscLinks: [
        { text: 'Documentation', url: 'https://docs.example.com' },
        { text: 'Support', url: 'https://support.example.com' },
      ],
      favIcon: {
        default: '/favicon.ico',
        alternative: '/favicon-32x32.png',
      },
    },
  },
});
```

## Queue Grouping

Organize queues into logical groups:

```typescript
interface QueueGroup {
  name: string;
  queues: Queue[];
}

class GroupedBullBoard {
  private serverAdapter: ExpressAdapter;

  constructor(groups: QueueGroup[], connection: Redis) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    // Flatten and prefix queue names for grouping
    const adapters = groups.flatMap((group) =>
      group.queues.map((queue) => {
        // Add prefix to help identify groups in UI
        const adapter = new BullMQAdapter(queue, {
          description: `Group: ${group.name}`,
        });
        return adapter;
      })
    );

    createBullBoard({
      queues: adapters,
      serverAdapter: this.serverAdapter,
    });
  }

  getRouter() {
    return this.serverAdapter.getRouter();
  }
}

// Usage
const groups: QueueGroup[] = [
  {
    name: 'Communication',
    queues: [emailQueue, smsQueue, pushQueue],
  },
  {
    name: 'Processing',
    queues: [orderQueue, paymentQueue, reportQueue],
  },
  {
    name: 'Background',
    queues: [cleanupQueue, syncQueue],
  },
];

const groupedBoard = new GroupedBullBoard(groups, connection);
app.use('/admin/queues', groupedBoard.getRouter());
```

## Monitoring Multiple Environments

Set up Bull Board for multiple environments:

```typescript
interface EnvironmentConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  queues: string[];
}

class MultiEnvironmentBoard {
  private boards: Map<string, {
    adapter: ExpressAdapter;
    connection: Redis;
    queues: Queue[];
  }> = new Map();

  async setup(environments: EnvironmentConfig[]) {
    for (const env of environments) {
      const connection = new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
        maxRetriesPerRequest: null,
      });

      const queues = env.queues.map(
        (name) => new Queue(name, { connection })
      );

      const adapter = new ExpressAdapter();
      adapter.setBasePath(`/admin/${env.name}/queues`);

      createBullBoard({
        queues: queues.map((q) => new BullMQAdapter(q)),
        serverAdapter: adapter,
        options: {
          uiConfig: {
            boardTitle: `${env.name.toUpperCase()} Environment`,
          },
        },
      });

      this.boards.set(env.name, { adapter, connection, queues });
    }
  }

  setupRoutes(app: express.Application) {
    for (const [name, { adapter }] of this.boards) {
      app.use(`/admin/${name}/queues`, adapter.getRouter());
    }

    // Index page listing all environments
    app.get('/admin', (req, res) => {
      const envLinks = Array.from(this.boards.keys())
        .map((name) => `<li><a href="/admin/${name}/queues">${name}</a></li>`)
        .join('');

      res.send(`
        <html>
          <head><title>Queue Monitoring</title></head>
          <body>
            <h1>Select Environment</h1>
            <ul>${envLinks}</ul>
          </body>
        </html>
      `);
    });
  }

  async close() {
    for (const { connection, queues } of this.boards.values()) {
      await Promise.all(queues.map((q) => q.close()));
      await connection.quit();
    }
  }
}

// Usage
const multiBoard = new MultiEnvironmentBoard();
await multiBoard.setup([
  {
    name: 'development',
    redis: { host: 'localhost', port: 6379 },
    queues: ['emails', 'orders'],
  },
  {
    name: 'staging',
    redis: { host: 'staging-redis', port: 6379 },
    queues: ['emails', 'orders', 'reports'],
  },
  {
    name: 'production',
    redis: { host: 'prod-redis', port: 6379, password: 'secret' },
    queues: ['emails', 'orders', 'reports', 'analytics'],
  },
]);

multiBoard.setupRoutes(app);
```

## Job Actions and Management

Programmatic job management alongside Bull Board:

```typescript
class QueueManager {
  private queues: Map<string, Queue> = new Map();

  constructor(queueNames: string[], connection: Redis) {
    for (const name of queueNames) {
      this.queues.set(name, new Queue(name, { connection }));
    }
  }

  async retryAllFailed(queueName: string): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const failed = await queue.getFailed();
    let retried = 0;

    for (const job of failed) {
      await job.retry();
      retried++;
    }

    return retried;
  }

  async cleanOldJobs(queueName: string, ageMs: number): Promise<number[]> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const results = await Promise.all([
      queue.clean(ageMs, 1000, 'completed'),
      queue.clean(ageMs, 1000, 'failed'),
    ]);

    return results.map((r) => r.length);
  }

  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  getQueues(): Queue[] {
    return Array.from(this.queues.values());
  }
}

// API endpoints alongside Bull Board
const queueManager = new QueueManager(['emails', 'orders'], connection);

app.post('/api/queues/:name/retry-failed', async (req, res) => {
  try {
    const count = await queueManager.retryAllFailed(req.params.name);
    res.json({ success: true, retriedCount: count });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/queues/:name/clean', async (req, res) => {
  try {
    const ageMs = req.body.ageMs || 24 * 60 * 60 * 1000; // Default 24 hours
    const counts = await queueManager.cleanOldJobs(req.params.name, ageMs);
    res.json({ success: true, cleanedCompleted: counts[0], cleanedFailed: counts[1] });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/queues/:name/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats(req.params.name);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
```

## Docker Deployment

Deploy Bull Board in a Docker container:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "dist/bull-board-server.js"]
```

```typescript
// bull-board-server.ts
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;
const queueNames = (process.env.QUEUE_NAMES || 'default').split(',');
const port = parseInt(process.env.PORT || '3000');

const connection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
});

const queues = queueNames.map((name) => new Queue(name.trim(), { connection }));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.use('/', serverAdapter.getRouter());

app.listen(port, () => {
  console.log(`Bull Board running on port ${port}`);
  console.log(`Monitoring queues: ${queueNames.join(', ')}`);
});
```

## Best Practices

1. **Secure Bull Board in production** - Always use authentication.

2. **Use read-only mode for viewers** - Prevent accidental job modifications.

3. **Monitor connection health** - Ensure Redis connectivity.

4. **Limit job history** - Configure removeOnComplete to prevent memory issues.

5. **Use environment variables** - Never hardcode credentials.

6. **Add rate limiting** - Prevent abuse of the dashboard.

7. **Log access** - Track who accesses the dashboard.

8. **Set up alerts** - Use Bull Board alongside automated alerting.

9. **Deploy separately** - Consider dedicated Bull Board deployments.

10. **Update regularly** - Keep Bull Board updated for security fixes.

## Conclusion

Bull Board provides an excellent visual interface for monitoring and managing BullMQ queues. By integrating it with your application framework and adding proper authentication, you get a powerful tool for understanding queue behavior, debugging issues, and managing jobs in real-time. Use it alongside automated monitoring and alerting for comprehensive queue observability.
