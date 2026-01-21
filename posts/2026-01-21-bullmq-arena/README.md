# How to Monitor BullMQ with Arena

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Arena, Monitoring, Dashboard, Queue Visualization, Job Management

Description: A comprehensive guide to setting up Arena for monitoring BullMQ queues, including configuration options, queue visualization, job inspection, and building a production-ready monitoring dashboard.

---

Arena is a lightweight, interactive dashboard for monitoring Bull and BullMQ queues. It provides real-time visibility into queue status, job details, and allows manual job management. This guide covers setting up Arena with BullMQ for effective queue monitoring.

## Installing Arena

Install Arena and BullMQ:

```bash
npm install bull-arena bullmq ioredis
```

## Basic Setup

Set up Arena with Express:

```typescript
import express from 'express';
import Arena from 'bull-arena';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const app = express();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Arena configuration
const arenaConfig = Arena(
  {
    BullMQ: Queue,
    queues: [
      {
        type: 'bullmq',
        name: 'emails',
        hostId: 'Main Server',
        redis: redisConfig,
      },
      {
        type: 'bullmq',
        name: 'orders',
        hostId: 'Main Server',
        redis: redisConfig,
      },
      {
        type: 'bullmq',
        name: 'notifications',
        hostId: 'Main Server',
        redis: redisConfig,
      },
    ],
  },
  {
    basePath: '/arena',
    disableListen: true, // Use Express server
  }
);

// Mount Arena
app.use('/arena', arenaConfig);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Arena dashboard: http://localhost:3000/arena');
});
```

## Configuration Options

Configure Arena with advanced options:

```typescript
interface ArenaQueueConfig {
  type: 'bullmq';
  name: string;
  hostId: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: object;
  };
  prefix?: string;
}

const queues: ArenaQueueConfig[] = [
  {
    type: 'bullmq',
    name: 'high-priority',
    hostId: 'Production',
    redis: {
      host: 'prod-redis.example.com',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      tls: {},
    },
    prefix: 'bull', // Queue prefix in Redis
  },
  {
    type: 'bullmq',
    name: 'low-priority',
    hostId: 'Production',
    redis: {
      host: 'prod-redis.example.com',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
];

const arenaConfig = Arena(
  {
    BullMQ: Queue,
    queues,
  },
  {
    basePath: '/arena',
    disableListen: true,
    useCdn: false, // Serve assets locally
  }
);
```

## Multiple Redis Instances

Monitor queues across different Redis servers:

```typescript
const arenaConfig = Arena(
  {
    BullMQ: Queue,
    queues: [
      // Production Redis
      {
        type: 'bullmq',
        name: 'emails',
        hostId: 'Production',
        redis: {
          host: 'prod-redis.example.com',
          port: 6379,
          password: process.env.PROD_REDIS_PASSWORD,
        },
      },
      {
        type: 'bullmq',
        name: 'orders',
        hostId: 'Production',
        redis: {
          host: 'prod-redis.example.com',
          port: 6379,
          password: process.env.PROD_REDIS_PASSWORD,
        },
      },
      // Staging Redis
      {
        type: 'bullmq',
        name: 'emails',
        hostId: 'Staging',
        redis: {
          host: 'staging-redis.example.com',
          port: 6379,
          password: process.env.STAGING_REDIS_PASSWORD,
        },
      },
      // Development Redis
      {
        type: 'bullmq',
        name: 'emails',
        hostId: 'Development',
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    ],
  },
  {
    basePath: '/arena',
    disableListen: true,
  }
);
```

## Authentication

Add authentication to Arena:

```typescript
import basicAuth from 'express-basic-auth';

// Basic authentication
const authMiddleware = basicAuth({
  users: {
    admin: process.env.ARENA_PASSWORD || 'secret',
  },
  challenge: true,
  realm: 'Arena Dashboard',
});

// Apply authentication
app.use('/arena', authMiddleware, arenaConfig);
```

## Session-Based Authentication

More robust authentication with sessions:

```typescript
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

app.use(session({
  secret: process.env.SESSION_SECRET || 'arena-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure passport
passport.use(new LocalStrategy(async (username, password, done) => {
  // Replace with your authentication logic
  if (username === 'admin' && password === process.env.ARENA_PASSWORD) {
    return done(null, { id: 1, username: 'admin' });
  }
  return done(null, false);
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  done(null, { id: 1, username: 'admin' });
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <body>
        <form method="POST" action="/login">
          <input name="username" placeholder="Username" required>
          <input name="password" type="password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/arena',
  failureRedirect: '/login',
}));

// Protect Arena
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.use('/arena', requireAuth, arenaConfig);
```

## Dynamic Queue Discovery

Automatically discover and monitor queues:

```typescript
import { Redis } from 'ioredis';

class DynamicArena {
  private redis: Redis;
  private prefix: string;

  constructor(redisConfig: any, prefix = 'bull') {
    this.redis = new Redis(redisConfig);
    this.prefix = prefix;
  }

  async discoverQueues(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.prefix}:*:meta`);
    const queueNames = keys.map((key) => {
      const parts = key.split(':');
      return parts[1];
    });

    return [...new Set(queueNames)];
  }

  async createArenaConfig(hostId: string) {
    const queueNames = await this.discoverQueues();

    const queues = queueNames.map((name) => ({
      type: 'bullmq' as const,
      name,
      hostId,
      redis: this.redis.options,
      prefix: this.prefix,
    }));

    return Arena(
      {
        BullMQ: Queue,
        queues,
      },
      {
        basePath: '/arena',
        disableListen: true,
      }
    );
  }
}

// Usage
async function setupDynamicArena() {
  const dynamicArena = new DynamicArena({
    host: 'localhost',
    port: 6379,
  });

  const arenaConfig = await dynamicArena.createArenaConfig('Main Server');
  app.use('/arena', arenaConfig);
}

setupDynamicArena();
```

## Custom Job Actions

Add custom job actions with API endpoints:

```typescript
import { Queue, Job } from 'bullmq';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queues: Map<string, Queue> = new Map();

// Initialize queues
['emails', 'orders', 'notifications'].forEach((name) => {
  queues.set(name, new Queue(name, { connection }));
});

// API: Get job details
app.get('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const job = await queue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();

    res.json({
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Retry failed job
app.post('/api/queues/:queueName/jobs/:jobId/retry', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const job = await queue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    if (state !== 'failed') {
      return res.status(400).json({ error: 'Job is not in failed state' });
    }

    await job.retry();
    res.json({ success: true, message: 'Job queued for retry' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Remove job
app.delete('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const job = await queue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await job.remove();
    res.json({ success: true, message: 'Job removed' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Get queue statistics
app.get('/api/queues/:queueName/stats', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    res.json({
      name: req.params.queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Pause/resume queue
app.post('/api/queues/:queueName/pause', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    await queue.pause();
    res.json({ success: true, message: 'Queue paused' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/queues/:queueName/resume', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    await queue.resume();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Clean queue
app.post('/api/queues/:queueName/clean', async (req, res) => {
  try {
    const queue = queues.get(req.params.queueName);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const { status, age } = req.body;
    const ageMs = age || 24 * 60 * 60 * 1000; // Default 24 hours

    const removed = await queue.clean(ageMs, 1000, status || 'completed');
    res.json({ success: true, removed: removed.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
```

## Real-Time Updates with WebSockets

Add real-time updates to complement Arena:

```typescript
import { Server as SocketServer } from 'socket.io';
import { QueueEvents } from 'bullmq';
import http from 'http';

const server = http.createServer(app);
const io = new SocketServer(server);

// Set up queue events listeners
const queueEventsMap: Map<string, QueueEvents> = new Map();

['emails', 'orders', 'notifications'].forEach((queueName) => {
  const queueEvents = new QueueEvents(queueName, { connection });
  queueEventsMap.set(queueName, queueEvents);

  // Emit events to connected clients
  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    io.to(queueName).emit('job:completed', {
      queue: queueName,
      jobId,
      returnvalue,
      timestamp: Date.now(),
    });
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    io.to(queueName).emit('job:failed', {
      queue: queueName,
      jobId,
      failedReason,
      timestamp: Date.now(),
    });
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    io.to(queueName).emit('job:progress', {
      queue: queueName,
      jobId,
      progress: data,
      timestamp: Date.now(),
    });
  });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to queue updates
  socket.on('subscribe', (queueName: string) => {
    socket.join(queueName);
    console.log(`Client ${socket.id} subscribed to ${queueName}`);
  });

  // Unsubscribe from queue updates
  socket.on('unsubscribe', (queueName: string) => {
    socket.leave(queueName);
    console.log(`Client ${socket.id} unsubscribed from ${queueName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server with Arena and WebSocket running on port 3000');
});
```

## Docker Deployment

Deploy Arena in a container:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  arena:
    build: .
    ports:
      - '3000:3000'
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - ARENA_PASSWORD=secure-password
      - SESSION_SECRET=session-secret
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

## Kubernetes Deployment

Deploy Arena to Kubernetes:

```yaml
# arena-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arena
spec:
  replicas: 1
  selector:
    matchLabels:
      app: arena
  template:
    metadata:
      labels:
        app: arena
    spec:
      containers:
        - name: arena
          image: your-registry/arena:latest
          ports:
            - containerPort: 3000
          env:
            - name: REDIS_HOST
              value: 'redis-service'
            - name: REDIS_PORT
              value: '6379'
            - name: ARENA_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: arena-secrets
                  key: password
          resources:
            requests:
              memory: '128Mi'
              cpu: '100m'
            limits:
              memory: '256Mi'
              cpu: '200m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: arena-service
spec:
  selector:
    app: arena
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: arena-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: arena-basic-auth
spec:
  rules:
    - host: arena.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: arena-service
                port:
                  number: 80
```

## Health Check Endpoint

Add health checks for monitoring:

```typescript
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    await connection.ping();

    res.json({
      status: 'healthy',
      redis: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'disconnected',
      error: (error as Error).message,
    });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await connection.ping();
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});
```

## Best Practices

1. **Always use authentication** - Protect Arena in production environments.

2. **Monitor multiple environments separately** - Use different hostIds for clarity.

3. **Limit job data display** - Large job data can slow down the interface.

4. **Use read-only access when possible** - Prevent accidental job modifications.

5. **Set up health checks** - Monitor Arena availability.

6. **Configure job retention** - Clean old jobs to keep Arena responsive.

7. **Use HTTPS in production** - Secure all traffic to Arena.

8. **Implement logging** - Track access and actions in Arena.

9. **Regular updates** - Keep Arena and dependencies updated.

10. **Complement with alerting** - Use Arena alongside automated monitoring.

## Conclusion

Arena provides a straightforward way to monitor and manage BullMQ queues through a web interface. By configuring authentication, connecting to multiple Redis instances, and adding custom API endpoints, you can build a comprehensive monitoring solution. Use Arena alongside automated monitoring and alerting for complete queue observability.
