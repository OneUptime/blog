# How to Implement Async Processing Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Performance, Backend, Async, Message Queue, Optimization

Description: Learn async processing patterns to handle time-consuming tasks without blocking user requests. This guide covers message queues, background workers, and event-driven architectures with practical code examples.

---

Synchronous request handling works until it does not. When a user request triggers an email, processes an image, or generates a report, making them wait degrades the experience. Worse, long-running synchronous operations tie up server threads, reducing your application's capacity to handle other requests.

Async processing moves time-consuming work to background workers, returning immediately to the user while the work completes later. This guide covers practical patterns for implementing async processing.

## When to Use Async Processing

```mermaid
flowchart TD
    A[User Request] --> B{Task Type?}
    B -->|Immediate Response Needed| C[Sync Processing]
    B -->|Can Wait| D[Async Processing]

    D --> E[Queue Task]
    E --> F[Return Immediately]

    G[Background Worker] --> H[Process Task]
    H --> I[Notify Completion]
```

| Use Case | Why Async? |
|----------|------------|
| Email sending | External service latency |
| Image/video processing | CPU intensive |
| Report generation | Database heavy |
| Third-party API calls | Network latency, rate limits |
| Data exports | Large data sets |
| Webhook delivery | Unreliable endpoints |

## Message Queue Patterns

### Redis Queue with Bull (Node.js)

```javascript
const Queue = require('bull');

// Create a queue for email processing
const emailQueue = new Queue('email', {
  redis: {
    host: 'localhost',
    port: 6379
  },
  defaultJobOptions: {
    attempts: 3,                    // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000                   // Start with 2s delay
    },
    removeOnComplete: 100,          // Keep last 100 completed jobs
    removeOnFail: 500               // Keep last 500 failed jobs
  }
});

// Producer: Add jobs to the queue
async function sendEmailAsync(to, subject, body, options = {}) {
  const job = await emailQueue.add(
    {
      to,
      subject,
      body,
      timestamp: Date.now()
    },
    {
      priority: options.priority || 0,    // Lower = higher priority
      delay: options.delay || 0,          // Delay before processing
      jobId: options.idempotencyKey       // Prevent duplicate jobs
    }
  );

  console.log(`Email job queued: ${job.id}`);
  return job.id;
}

// Consumer: Process jobs from the queue
emailQueue.process(5, async (job) => {    // Process 5 jobs concurrently
  const { to, subject, body } = job.data;

  console.log(`Processing email job ${job.id}`);

  // Update progress (useful for long-running jobs)
  await job.progress(10);

  // Actual email sending
  const result = await sendEmail(to, subject, body);

  await job.progress(100);

  return result;
});

// Event handlers for monitoring
emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled and will be reprocessed`);
});

// API endpoint
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body;

  const jobId = await sendEmailAsync(to, subject, body);

  // Return immediately with job ID for status tracking
  res.json({
    status: 'queued',
    jobId,
    statusUrl: `/api/jobs/${jobId}/status`
  });
});

// Status endpoint
app.get('/api/jobs/:jobId/status', async (req, res) => {
  const job = await emailQueue.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress();

  res.json({
    id: job.id,
    state,
    progress,
    data: job.data,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn
  });
});
```

### Celery with RabbitMQ (Python)

```python
from celery import Celery
from celery.result import AsyncResult
import time

# Configure Celery
app = Celery(
    'tasks',
    broker='amqp://guest:guest@localhost:5672//',
    backend='redis://localhost:6379/0'
)

# Task configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Retry configuration
    task_acks_late=True,              # Acknowledge after completion
    task_reject_on_worker_lost=True,  # Requeue if worker dies

    # Rate limiting
    task_default_rate_limit='100/m',  # 100 tasks per minute

    # Result expiration
    result_expires=3600,              # Results expire after 1 hour

    # Worker configuration
    worker_prefetch_multiplier=4,     # Tasks to prefetch per worker
    worker_concurrency=4              # Number of worker processes
)


# Define a task
@app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    rate_limit='10/m'
)
def process_image(self, image_path, operations):
    """
    Process an image with the specified operations.
    Retries on failure with exponential backoff.
    """
    try:
        # Update task state for progress tracking
        self.update_state(state='PROCESSING', meta={'progress': 0})

        # Load image
        image = load_image(image_path)
        self.update_state(state='PROCESSING', meta={'progress': 25})

        # Apply operations
        for i, operation in enumerate(operations):
            image = apply_operation(image, operation)
            progress = 25 + (i + 1) * 50 // len(operations)
            self.update_state(state='PROCESSING', meta={'progress': progress})

        # Save result
        output_path = save_image(image)
        self.update_state(state='PROCESSING', meta={'progress': 100})

        return {'status': 'success', 'output_path': output_path}

    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(
            exc=exc,
            countdown=60 * (2 ** self.request.retries)
        )


# Chain multiple tasks
@app.task
def notify_completion(result, user_email):
    """Send notification when processing is complete."""
    send_email(
        to=user_email,
        subject='Processing Complete',
        body=f'Your file is ready: {result["output_path"]}'
    )
    return result


# Flask API integration
from flask import Flask, request, jsonify

flask_app = Flask(__name__)

@flask_app.route('/api/process-image', methods=['POST'])
def api_process_image():
    image_path = request.json['image_path']
    operations = request.json['operations']
    user_email = request.json.get('notify_email')

    # Chain tasks: process image, then notify
    if user_email:
        task = (
            process_image.s(image_path, operations) |
            notify_completion.s(user_email)
        ).apply_async()
    else:
        task = process_image.delay(image_path, operations)

    return jsonify({
        'task_id': task.id,
        'status_url': f'/api/tasks/{task.id}'
    }), 202


@flask_app.route('/api/tasks/<task_id>')
def get_task_status(task_id):
    result = AsyncResult(task_id, app=app)

    response = {
        'task_id': task_id,
        'status': result.status
    }

    if result.status == 'PROCESSING':
        response['progress'] = result.info.get('progress', 0)
    elif result.status == 'SUCCESS':
        response['result'] = result.result
    elif result.status == 'FAILURE':
        response['error'] = str(result.result)

    return jsonify(response)
```

## Event-Driven Processing

### Event Emitter Pattern (Node.js)

```javascript
const EventEmitter = require('events');

class OrderProcessor extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Each handler runs independently
    this.on('order:created', this.sendConfirmationEmail.bind(this));
    this.on('order:created', this.updateInventory.bind(this));
    this.on('order:created', this.notifyWarehouse.bind(this));
    this.on('order:created', this.trackAnalytics.bind(this));

    this.on('order:shipped', this.sendShippingNotification.bind(this));
    this.on('order:shipped', this.updateOrderStatus.bind(this));
  }

  async createOrder(orderData) {
    // Synchronous: validate and save order
    const order = await this.saveOrder(orderData);

    // Asynchronous: emit event for background processing
    // Use setImmediate to not block the response
    setImmediate(() => {
      this.emit('order:created', order);
    });

    return order;
  }

  async sendConfirmationEmail(order) {
    try {
      await emailService.send({
        to: order.customerEmail,
        template: 'order-confirmation',
        data: order
      });
      console.log(`Confirmation email sent for order ${order.id}`);
    } catch (error) {
      console.error(`Failed to send confirmation email: ${error.message}`);
      // Don't throw - other handlers should still run
    }
  }

  async updateInventory(order) {
    try {
      for (const item of order.items) {
        await inventoryService.decrementStock(item.productId, item.quantity);
      }
      console.log(`Inventory updated for order ${order.id}`);
    } catch (error) {
      console.error(`Failed to update inventory: ${error.message}`);
      // Queue for retry
      await retryQueue.add('inventory-update', { orderId: order.id });
    }
  }

  async notifyWarehouse(order) {
    try {
      await warehouseService.createPickList(order);
      console.log(`Warehouse notified for order ${order.id}`);
    } catch (error) {
      console.error(`Failed to notify warehouse: ${error.message}`);
    }
  }

  async trackAnalytics(order) {
    analytics.track('Order Created', {
      orderId: order.id,
      total: order.total,
      itemCount: order.items.length
    });
  }
}

const orderProcessor = new OrderProcessor();

// API usage
app.post('/api/orders', async (req, res) => {
  const order = await orderProcessor.createOrder(req.body);

  // Response returns immediately
  // Background tasks continue processing
  res.status(201).json(order);
});
```

### Pub/Sub with Redis

```javascript
const Redis = require('ioredis');

// Publisher (in API server)
const publisher = new Redis();

async function publishEvent(channel, event) {
  const message = JSON.stringify({
    ...event,
    timestamp: Date.now(),
    id: generateId()
  });

  await publisher.publish(channel, message);
  console.log(`Published to ${channel}:`, event.type);
}

// API endpoint
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);

  // Publish event for async processing
  await publishEvent('user-events', {
    type: 'user:created',
    data: user
  });

  res.status(201).json(user);
});


// Subscriber (in separate worker process)
const subscriber = new Redis();

subscriber.subscribe('user-events', 'order-events', (err, count) => {
  console.log(`Subscribed to ${count} channels`);
});

subscriber.on('message', async (channel, message) => {
  const event = JSON.parse(message);

  console.log(`Received ${event.type} from ${channel}`);

  try {
    await handleEvent(event);
  } catch (error) {
    console.error(`Failed to handle event: ${error.message}`);
    // Store failed events for retry
    await storeFailedEvent(event, error);
  }
});

async function handleEvent(event) {
  switch (event.type) {
    case 'user:created':
      await sendWelcomeEmail(event.data);
      await createDefaultSettings(event.data.id);
      await notifyAdmins(event.data);
      break;

    case 'order:created':
      await processOrderWorkflow(event.data);
      break;

    default:
      console.warn(`Unknown event type: ${event.type}`);
  }
}
```

## Async Processing with Polling

For simple cases without message queues:

```python
import threading
import time
from queue import Queue
from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

# In-memory task storage (use Redis/database in production)
tasks = {}
task_queue = Queue()

def process_task(task_id, task_data):
    """Background task processor."""
    tasks[task_id]['status'] = 'processing'
    tasks[task_id]['started_at'] = time.time()

    try:
        # Simulate long-running work
        result = perform_heavy_computation(task_data)

        tasks[task_id]['status'] = 'completed'
        tasks[task_id]['result'] = result
        tasks[task_id]['completed_at'] = time.time()

    except Exception as e:
        tasks[task_id]['status'] = 'failed'
        tasks[task_id]['error'] = str(e)

def worker():
    """Worker thread that processes tasks from the queue."""
    while True:
        task_id, task_data = task_queue.get()
        process_task(task_id, task_data)
        task_queue.task_done()

# Start worker threads
for i in range(4):
    t = threading.Thread(target=worker, daemon=True)
    t.start()

@app.route('/api/compute', methods=['POST'])
def submit_task():
    task_id = str(uuid.uuid4())

    tasks[task_id] = {
        'id': task_id,
        'status': 'queued',
        'created_at': time.time(),
        'data': request.json
    }

    task_queue.put((task_id, request.json))

    return jsonify({
        'task_id': task_id,
        'status': 'queued',
        'poll_url': f'/api/tasks/{task_id}'
    }), 202

@app.route('/api/tasks/<task_id>')
def get_task(task_id):
    if task_id not in tasks:
        return jsonify({'error': 'Task not found'}), 404

    task = tasks[task_id]

    response = {
        'id': task['id'],
        'status': task['status'],
        'created_at': task['created_at']
    }

    if task['status'] == 'completed':
        response['result'] = task['result']
        response['completed_at'] = task['completed_at']
    elif task['status'] == 'failed':
        response['error'] = task['error']

    return jsonify(response)
```

## Summary

Async processing improves user experience and system scalability by moving slow operations out of the request path.

| Pattern | Complexity | Best For |
|---------|------------|----------|
| Simple queue | Low | Single-server applications |
| Message queue (Bull/Celery) | Medium | Distributed systems, retries |
| Event-driven | Medium | Multiple handlers per event |
| Pub/Sub | High | Microservices, real-time updates |

Choose the simplest pattern that meets your needs. Start with a basic queue and evolve to more complex patterns as your requirements grow. Always implement proper error handling, retries, and monitoring for background tasks since failures are harder to detect than synchronous errors.
