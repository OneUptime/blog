# How to Use Celery for Distributed Task Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Celery, Task Queue, Redis, Distributed Systems, Background Jobs

Description: A practical guide to building distributed task queues with Celery. Learn task routing, result backends, rate limiting, and monitoring for production deployments.

---

> Distributed task queues allow you to scale background processing across multiple workers and machines. Celery is the de facto standard for distributed task processing in Python, handling millions of tasks per day at companies like Instagram, Mozilla, and Robinhood.

This guide covers the architecture and patterns needed to build production-grade distributed task systems with Celery.

---

## Understanding Distributed Task Architecture

Before diving into code, let's understand how Celery distributes work across workers.

```mermaid
graph LR
    subgraph Producers
        A[Web Server 1]
        B[Web Server 2]
        C[API Server]
    end

    subgraph Message Broker
        D[(Redis/RabbitMQ)]
    end

    subgraph Workers
        E[Worker 1]
        F[Worker 2]
        G[Worker 3]
        H[Worker 4]
    end

    subgraph Result Backend
        I[(Redis)]
    end

    A -->|Task| D
    B -->|Task| D
    C -->|Task| D
    D -->|Distribute| E
    D -->|Distribute| F
    D -->|Distribute| G
    D -->|Distribute| H
    E -->|Result| I
    F -->|Result| I
    G -->|Result| I
    H -->|Result| I
```

The architecture consists of three main components:

1. **Producers**: Applications that create and send tasks to the queue
2. **Message Broker**: Stores tasks until workers pick them up (Redis or RabbitMQ)
3. **Workers**: Processes that execute tasks and optionally store results

---

## Setting Up a Distributed Celery Environment

### Installation

```bash
# Install Celery with Redis support
pip install celery[redis] redis

# For RabbitMQ support
pip install celery[librabbitmq]

# For monitoring
pip install flower
```

### Project Structure

Organize your Celery project for distributed deployment:

```
myproject/
    celery_app/
        __init__.py       # Celery app initialization
        config.py         # Configuration settings
        tasks/
            __init__.py   # Task discovery
            email.py      # Email related tasks
            reports.py    # Report generation tasks
            analytics.py  # Analytics processing tasks
    workers/
        default.py        # Default worker configuration
        heavy.py          # Heavy computation worker config
        priority.py       # Priority queue worker config
```

### Celery Application Setup

```python
# celery_app/__init__.py
from celery import Celery
import os

# Create the Celery application instance
# The first argument is the name of the current module
# This name is used for auto-generating task names
app = Celery('myproject')

# Load configuration from a separate module
# This keeps configuration organized and environment-specific
app.config_from_object('celery_app.config')

# Autodiscover tasks from all registered task modules
# This scans the tasks package for @app.task decorated functions
app.autodiscover_tasks([
    'celery_app.tasks.email',
    'celery_app.tasks.reports',
    'celery_app.tasks.analytics',
])

# Optional: Set up default task options
app.conf.task_default_queue = 'default'
app.conf.task_default_exchange = 'default'
app.conf.task_default_routing_key = 'default'
```

### Configuration for Distributed Deployments

```python
# celery_app/config.py
import os
from kombu import Queue, Exchange

# Broker and backend URLs from environment
# This allows different configurations per environment
broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')

# Serialization settings
# JSON is safer than pickle (prevents code injection)
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']

# Timezone configuration
timezone = 'UTC'
enable_utc = True

# Task execution settings for reliability
# acks_late ensures task is acknowledged after completion
# This prevents task loss if a worker crashes mid-execution
task_acks_late = True
task_reject_on_worker_lost = True

# Prefetch settings control how many tasks a worker reserves
# Lower values provide better task distribution across workers
# Higher values improve throughput for fast tasks
worker_prefetch_multiplier = 4

# Concurrency settings
# This determines how many tasks run simultaneously per worker
worker_concurrency = int(os.getenv('CELERY_CONCURRENCY', 8))

# Define exchanges for message routing
# Direct exchange routes messages based on exact routing key match
default_exchange = Exchange('default', type='direct')
priority_exchange = Exchange('priority', type='direct')
analytics_exchange = Exchange('analytics', type='direct')

# Define task queues
# Each queue can be consumed by dedicated workers
task_queues = (
    # Default queue for general purpose tasks
    Queue(
        'default',
        exchange=default_exchange,
        routing_key='default'
    ),
    # High priority queue for urgent tasks
    Queue(
        'high_priority',
        exchange=priority_exchange,
        routing_key='high'
    ),
    # Low priority queue for background processing
    Queue(
        'low_priority',
        exchange=priority_exchange,
        routing_key='low'
    ),
    # Dedicated queue for CPU-intensive analytics
    Queue(
        'analytics',
        exchange=analytics_exchange,
        routing_key='analytics'
    ),
    # Queue for email sending tasks
    Queue(
        'email',
        exchange=default_exchange,
        routing_key='email'
    ),
)

# Task routing configuration
# Maps task names to specific queues
task_routes = {
    # Route email tasks to dedicated email queue
    'celery_app.tasks.email.*': {'queue': 'email'},
    
    # Route analytics to analytics queue
    'celery_app.tasks.analytics.*': {'queue': 'analytics'},
    
    # Specific task routing
    'celery_app.tasks.reports.generate_urgent_report': {
        'queue': 'high_priority'
    },
}
```

---

## Task Routing Strategies

Task routing determines which worker processes which tasks. This is essential for optimizing resource usage.

```mermaid
graph TB
    subgraph Task Producer
        P[Application]
    end

    subgraph Message Broker
        E1[Email Exchange]
        E2[Analytics Exchange]
        E3[Priority Exchange]
        
        Q1[Email Queue]
        Q2[Analytics Queue]
        Q3[High Priority Queue]
        Q4[Low Priority Queue]
    end

    subgraph Workers
        W1[Email Worker]
        W2[Analytics Worker]
        W3[Priority Worker]
    end

    P -->|email task| E1
    P -->|analytics task| E2
    P -->|urgent task| E3
    P -->|background task| E3

    E1 --> Q1
    E2 --> Q2
    E3 --> Q3
    E3 --> Q4

    Q1 --> W1
    Q2 --> W2
    Q3 --> W3
    Q4 --> W3
```

### Route by Task Type

```python
# celery_app/config.py

# Define routing based on task patterns
task_routes = {
    # All email tasks go to email queue
    'celery_app.tasks.email.*': {
        'queue': 'email',
        'routing_key': 'email',
    },
    
    # All report tasks go to reports queue
    'celery_app.tasks.reports.*': {
        'queue': 'reports',
        'routing_key': 'reports',
    },
    
    # Analytics tasks need more resources
    'celery_app.tasks.analytics.*': {
        'queue': 'analytics',
        'routing_key': 'analytics',
    },
}
```

### Route by Priority

```python
# celery_app/tasks/reports.py
from celery_app import app

@app.task(queue='high_priority')
def generate_urgent_report(report_id: str):
    """Generate an urgent report with high priority."""
    # High priority tasks are processed first
    # Use for time-sensitive operations
    return create_report(report_id)

@app.task(queue='low_priority')
def generate_monthly_report(month: int, year: int):
    """Generate monthly report in the background."""
    # Low priority tasks run when workers are less busy
    # Use for batch processing and non-urgent work
    return create_monthly_report(month, year)

@app.task
def generate_custom_report(params: dict):
    """Generate a custom report with default priority."""
    # Default queue for normal priority tasks
    return create_custom_report(params)
```

### Dynamic Routing

```python
# celery_app/routing.py
from celery import current_app

class TaskRouter:
    """
    Custom router that makes routing decisions based on task arguments.
    This allows dynamic routing at runtime based on task context.
    """
    
    def route_for_task(self, task, args=None, kwargs=None, **options):
        """
        Determine the queue for a task based on its arguments.
        
        Args:
            task: The task name
            args: Positional arguments passed to the task
            kwargs: Keyword arguments passed to the task
            
        Returns:
            dict with queue configuration or None for default routing
        """
        # Route based on user tier
        if kwargs and kwargs.get('user_tier') == 'premium':
            return {
                'queue': 'high_priority',
                'routing_key': 'high',
            }
        
        # Route based on data size
        if kwargs and kwargs.get('data_size', 0) > 1000000:
            return {
                'queue': 'heavy_processing',
                'routing_key': 'heavy',
            }
        
        # Default routing
        return None

# Register the router in config
# celery_app/config.py
task_routes = (TaskRouter(),)
```

### Runtime Queue Selection

```python
# You can specify the queue at call time
from celery_app.tasks.reports import generate_custom_report

# Send to specific queue regardless of default routing
generate_custom_report.apply_async(
    args=[{'type': 'sales'}],
    queue='high_priority',
    routing_key='high'
)

# Priority argument for message ordering within a queue
# (requires RabbitMQ x-max-priority queue argument)
generate_custom_report.apply_async(
    args=[{'type': 'sales'}],
    priority=9  # 0-9, higher is more urgent
)
```

---

## Result Backends

Result backends store the output of completed tasks. Choose based on your needs:

```mermaid
graph TB
    subgraph Worker
        T[Task Execution]
    end

    subgraph Result Backends
        R[(Redis)]
        D[(Database)]
        M[(MongoDB)]
        S[(S3/GCS)]
    end

    subgraph Consumers
        C1[API Server]
        C2[Dashboard]
        C3[Another Task]
    end

    T -->|Store Result| R
    T -->|Store Result| D
    T -->|Store Result| M
    T -->|Store Result| S

    R --> C1
    R --> C2
    R --> C3
```

### Redis Backend (Recommended)

```python
# celery_app/config.py

# Redis is fast and supports result expiration
result_backend = 'redis://localhost:6379/1'

# Result expiration prevents memory bloat
# Results are automatically deleted after this time
result_expires = 3600  # 1 hour in seconds

# Extended result info includes timing and more
result_extended = True

# Compression for large results
result_compression = 'gzip'
```

### Database Backend

```python
# For persistent results that need to survive restarts
# Requires: pip install sqlalchemy
result_backend = 'db+postgresql://user:pass@localhost/celery_results'

# SQLAlchemy table settings
database_table_names = {
    'task': 'celery_taskmeta',
    'group': 'celery_groupmeta',
}

# Engine options for connection pooling
database_engine_options = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_recycle': 3600,
}
```

### Working with Results

```python
from celery_app.tasks.reports import generate_report

# Submit task and get AsyncResult
result = generate_report.delay(report_id='123')

# Check task status without blocking
print(f"Task ID: {result.id}")
print(f"Status: {result.status}")
print(f"Ready: {result.ready()}")

# Get result with timeout (blocks until complete or timeout)
try:
    output = result.get(timeout=30)
    print(f"Result: {output}")
except TimeoutError:
    print("Task did not complete within 30 seconds")

# Get result without propagating exceptions
# Useful when you want to handle failures gracefully
output = result.get(propagate=False)
if result.failed():
    print(f"Task failed: {result.traceback}")

# Forget the result to free memory
# Use when you don't need the result stored
result.forget()
```

### Ignoring Results

```python
# For fire-and-forget tasks, disable result storage
# This saves memory and improves performance
@app.task(ignore_result=True)
def send_notification(user_id: str, message: str):
    """
    Send a notification without storing the result.
    Use ignore_result=True when:
    - You don't need to check task completion
    - The task is truly fire-and-forget
    - You want to reduce backend load
    """
    notify_user(user_id, message)

# Global setting to ignore all results by default
# celery_app/config.py
task_ignore_result = True

# Override for specific tasks that need results
@app.task(ignore_result=False)
def process_with_result(data: dict):
    """This task will store its result."""
    return process_data(data)
```

---

## Rate Limiting

Protect external services and manage resource consumption with rate limiting.

```mermaid
graph LR
    subgraph Tasks
        T1[Task 1]
        T2[Task 2]
        T3[Task 3]
        T4[Task N]
    end

    subgraph Rate Limiter
        RL[Token Bucket]
    end

    subgraph External Service
        API[API Endpoint]
    end

    T1 -->|Request| RL
    T2 -->|Request| RL
    T3 -->|Request| RL
    T4 -->|Request| RL
    RL -->|Throttled| API
```

### Task-Level Rate Limiting

```python
from celery_app import app

# Rate limit format: 'n/t' where n is number and t is time unit
# Time units: s (second), m (minute), h (hour)

@app.task(rate_limit='10/m')
def call_external_api(endpoint: str, data: dict):
    """
    Call external API with rate limiting.
    Maximum 10 calls per minute across all workers.
    """
    import requests
    response = requests.post(endpoint, json=data, timeout=30)
    return response.json()

@app.task(rate_limit='100/s')
def fast_rate_limited_task(item_id: str):
    """
    Higher rate limit for fast operations.
    100 tasks per second across all workers.
    """
    return process_item(item_id)

@app.task(rate_limit='1/h')
def hourly_limited_task():
    """
    Run at most once per hour.
    Useful for expensive operations or strict API limits.
    """
    return expensive_operation()
```

### Per-Worker vs Global Rate Limiting

```python
# celery_app/config.py

# Default rate limit (applied per worker)
task_default_rate_limit = '1000/m'

# Task annotations for specific rate limits
task_annotations = {
    # 60 calls per minute per worker
    'celery_app.tasks.email.send_email': {
        'rate_limit': '60/m',
    },
    # 10 calls per second per worker
    'celery_app.tasks.analytics.process_event': {
        'rate_limit': '10/s',
    },
}
```

### Dynamic Rate Limiting

```python
from celery_app import app
from celery import current_app

@app.task(bind=True)
def adaptive_api_call(self, endpoint: str, data: dict):
    """
    Task with adaptive rate limiting based on API response.
    Adjusts rate limit dynamically based on rate limit headers.
    """
    import requests
    
    response = requests.post(endpoint, json=data, timeout=30)
    
    # Check for rate limit headers
    remaining = int(response.headers.get('X-RateLimit-Remaining', 100))
    
    if remaining < 10:
        # Slow down when approaching limits
        # This updates the rate limit for this task type
        current_app.control.rate_limit(
            'celery_app.tasks.adaptive_api_call',
            '1/s'
        )
    elif remaining > 50:
        # Speed up when we have headroom
        current_app.control.rate_limit(
            'celery_app.tasks.adaptive_api_call',
            '10/s'
        )
    
    return response.json()
```

### Rate Limiting with Redis

```python
# For more sophisticated rate limiting, use Redis directly
import redis
from celery_app import app

# Initialize Redis client for rate limiting
redis_client = redis.Redis(host='localhost', port=6379, db=2)

def check_rate_limit(key: str, limit: int, window: int) -> bool:
    """
    Check if operation is within rate limit using sliding window.
    
    Args:
        key: Unique identifier for the rate limit bucket
        limit: Maximum number of operations in window
        window: Time window in seconds
        
    Returns:
        True if within limit, False if exceeded
    """
    import time
    
    current_time = int(time.time())
    window_start = current_time - window
    
    # Use sorted set with timestamp as score
    pipe = redis_client.pipeline()
    
    # Remove old entries outside the window
    pipe.zremrangebyscore(key, 0, window_start)
    
    # Count entries in current window
    pipe.zcard(key)
    
    # Add current request
    pipe.zadd(key, {f"{current_time}:{id(time)}": current_time})
    
    # Set expiration on the key
    pipe.expire(key, window)
    
    results = pipe.execute()
    current_count = results[1]
    
    return current_count < limit

@app.task(bind=True)
def rate_limited_external_call(self, api_name: str, data: dict):
    """
    External API call with custom rate limiting.
    Provides more control than Celery's built-in rate limiting.
    """
    rate_limit_key = f"rate_limit:{api_name}"
    
    if not check_rate_limit(rate_limit_key, limit=100, window=60):
        # Rate limit exceeded, retry after delay
        raise self.retry(countdown=10)
    
    return call_api(api_name, data)
```

---

## Worker Scaling and Management

```mermaid
graph TB
    subgraph Kubernetes Cluster
        subgraph Node 1
            W1[Email Worker x2]
            W2[Default Worker x4]
        end
        
        subgraph Node 2
            W3[Analytics Worker x2]
            W4[Default Worker x4]
        end
        
        subgraph Node 3
            W5[Heavy Worker x1]
            W6[Priority Worker x2]
        end
    end

    subgraph Message Broker
        R[(Redis Cluster)]
    end

    R --- W1
    R --- W2
    R --- W3
    R --- W4
    R --- W5
    R --- W6
```

### Worker Configuration

```python
# workers/default.py
# Configuration for default worker instances

from celery_app import app

# Worker-specific settings
worker_concurrency = 8
worker_prefetch_multiplier = 4

# Memory management
# Restart worker after processing N tasks to prevent memory leaks
worker_max_tasks_per_child = 1000

# Restart worker if memory exceeds threshold (in KB)
worker_max_memory_per_child = 200000  # 200MB

# Task time limits
# Soft limit sends SIGTERM, giving task time to clean up
task_soft_time_limit = 300  # 5 minutes

# Hard limit sends SIGKILL, immediately terminating the task
task_time_limit = 600  # 10 minutes
```

### Starting Workers

```bash
# Start a default worker
celery -A celery_app worker \
    --loglevel=info \
    --concurrency=8 \
    --queues=default

# Start a high-priority worker
celery -A celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=high_priority,default \
    --hostname=priority@%h

# Start an analytics worker with more memory
celery -A celery_app worker \
    --loglevel=info \
    --concurrency=2 \
    --queues=analytics \
    --max-memory-per-child=500000 \
    --hostname=analytics@%h

# Start email worker with rate limiting
celery -A celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=email \
    --hostname=email@%h
```

### Autoscaling

```bash
# Enable autoscaling based on load
# Worker will scale between 4 and 16 processes
celery -A celery_app worker \
    --autoscale=16,4 \
    --loglevel=info

# Custom autoscaler (in celery_app/config.py)
worker_autoscaler = 'celery_app.autoscaler:CustomAutoscaler'
```

```python
# celery_app/autoscaler.py
from celery.worker.autoscale import Autoscaler

class CustomAutoscaler(Autoscaler):
    """
    Custom autoscaler that considers queue depth.
    Scales up aggressively when queue is backing up.
    """
    
    def _maybe_scale(self, req=None):
        """Override scaling logic."""
        # Get current queue depth
        from celery_app import app
        
        with app.connection() as conn:
            tasks_in_queue = conn.default_channel.queue_declare(
                queue='default',
                passive=True
            ).message_count
        
        if tasks_in_queue > 100 and self.processes < self.max_concurrency:
            # Scale up if queue is backing up
            self.scale_up(min(tasks_in_queue // 10, self.max_concurrency - self.processes))
        elif tasks_in_queue < 10 and self.processes > self.min_concurrency:
            # Scale down if queue is nearly empty
            self.scale_down(1)
        
        return super()._maybe_scale(req)
```

---

## Monitoring and Observability

### Flower Dashboard

Flower provides a real-time web UI for monitoring Celery workers.

```bash
# Install Flower
pip install flower

# Start Flower with authentication
celery -A celery_app flower \
    --port=5555 \
    --basic_auth=admin:password \
    --broker_api=redis://localhost:6379/0

# Start Flower with Prometheus metrics
celery -A celery_app flower \
    --port=5555 \
    --prometheus_integration=true
```

### Custom Metrics with Prometheus

```python
# celery_app/monitoring.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
from celery.signals import (
    task_prerun, task_postrun, task_success, 
    task_failure, task_retry, worker_ready
)
import time

# Define metrics
TASK_STARTED = Counter(
    'celery_task_started_total',
    'Total number of tasks started',
    ['task_name', 'queue']
)

TASK_SUCCEEDED = Counter(
    'celery_task_succeeded_total',
    'Total number of tasks completed successfully',
    ['task_name', 'queue']
)

TASK_FAILED = Counter(
    'celery_task_failed_total',
    'Total number of tasks that failed',
    ['task_name', 'queue']
)

TASK_RETRIED = Counter(
    'celery_task_retried_total',
    'Total number of task retries',
    ['task_name', 'queue']
)

TASK_DURATION = Histogram(
    'celery_task_duration_seconds',
    'Task execution duration in seconds',
    ['task_name', 'queue'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0]
)

ACTIVE_TASKS = Gauge(
    'celery_active_tasks',
    'Number of currently running tasks',
    ['task_name', 'queue']
)

QUEUE_LENGTH = Gauge(
    'celery_queue_length',
    'Number of tasks waiting in queue',
    ['queue']
)

# Task start times storage
task_start_times = {}

@task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **kw):
    """Called before a task is executed."""
    queue = task.request.delivery_info.get('routing_key', 'unknown')
    
    TASK_STARTED.labels(task_name=task.name, queue=queue).inc()
    ACTIVE_TASKS.labels(task_name=task.name, queue=queue).inc()
    task_start_times[task_id] = time.time()

@task_postrun.connect
def on_task_postrun(task_id, task, args, kwargs, retval, state, **kw):
    """Called after a task is executed."""
    queue = task.request.delivery_info.get('routing_key', 'unknown')
    
    ACTIVE_TASKS.labels(task_name=task.name, queue=queue).dec()
    
    # Record duration
    start_time = task_start_times.pop(task_id, None)
    if start_time:
        duration = time.time() - start_time
        TASK_DURATION.labels(task_name=task.name, queue=queue).observe(duration)

@task_success.connect
def on_task_success(sender, result, **kwargs):
    """Called when a task succeeds."""
    queue = sender.request.delivery_info.get('routing_key', 'unknown')
    TASK_SUCCEEDED.labels(task_name=sender.name, queue=queue).inc()

@task_failure.connect
def on_task_failure(sender, task_id, exception, traceback, **kwargs):
    """Called when a task fails."""
    queue = sender.request.delivery_info.get('routing_key', 'unknown')
    TASK_FAILED.labels(task_name=sender.name, queue=queue).inc()

@task_retry.connect
def on_task_retry(sender, reason, **kwargs):
    """Called when a task is retried."""
    queue = sender.request.delivery_info.get('routing_key', 'unknown')
    TASK_RETRIED.labels(task_name=sender.name, queue=queue).inc()

@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    """Start Prometheus metrics server when worker is ready."""
    start_http_server(9090)  # Metrics available at :9090/metrics
```

### Structured Logging

```python
# celery_app/logging_config.py
import logging
import json
from celery.signals import task_prerun, task_postrun, task_failure
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        log_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
        }
        
        # Add extra fields if present
        if hasattr(record, 'task_id'):
            log_record['task_id'] = record.task_id
        if hasattr(record, 'task_name'):
            log_record['task_name'] = record.task_name
        
        return json.dumps(log_record)

# Configure logging
def setup_logging():
    """Set up structured JSON logging."""
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    
    logger = logging.getLogger('celery')
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    return logger

logger = setup_logging()

@task_prerun.connect
def log_task_start(task_id, task, args, kwargs, **kw):
    """Log task start with context."""
    logger.info(
        "Task started",
        extra={
            'task_id': task_id,
            'task_name': task.name,
            'args': str(args)[:200],  # Truncate to prevent large logs
        }
    )

@task_postrun.connect
def log_task_end(task_id, task, args, kwargs, retval, state, **kw):
    """Log task completion with context."""
    logger.info(
        f"Task completed with state {state}",
        extra={
            'task_id': task_id,
            'task_name': task.name,
            'state': state,
        }
    )

@task_failure.connect
def log_task_failure(task_id, exception, traceback, sender, **kwargs):
    """Log task failure with traceback."""
    logger.error(
        f"Task failed: {exception}",
        extra={
            'task_id': task_id,
            'task_name': sender.name,
            'exception': str(exception),
            'traceback': str(traceback)[:1000],  # Truncate traceback
        }
    )
```

---

## Error Handling and Recovery

### Retry Strategies

```python
from celery_app import app
from celery.exceptions import Retry
import requests

@app.task(
    bind=True,
    autoretry_for=(requests.RequestException, ConnectionError),
    retry_backoff=True,        # Exponential backoff: 2, 4, 8, 16 seconds...
    retry_backoff_max=600,     # Maximum 10 minutes between retries
    retry_jitter=True,         # Add randomness to prevent thundering herd
    max_retries=5,             # Give up after 5 attempts
)
def resilient_api_call(self, endpoint: str, payload: dict):
    """
    Make API call with automatic retry on transient failures.
    
    The autoretry_for decorator argument automatically retries
    the task when specified exceptions are raised.
    """
    response = requests.post(endpoint, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()

@app.task(bind=True, max_retries=10)
def custom_retry_logic(self, operation_id: str):
    """
    Task with custom retry logic for different error types.
    """
    try:
        result = perform_operation(operation_id)
        return result
        
    except TransientError as exc:
        # Transient errors: retry with exponential backoff
        countdown = min(2 ** self.request.retries * 30, 3600)
        raise self.retry(exc=exc, countdown=countdown)
        
    except RateLimitError as exc:
        # Rate limit: wait longer before retry
        raise self.retry(exc=exc, countdown=60)
        
    except PermanentError as exc:
        # Permanent failures: don't retry, log and return error
        logger.error(f"Permanent failure for {operation_id}: {exc}")
        return {'success': False, 'error': str(exc)}
```

### Dead Letter Queue Implementation

```mermaid
graph LR
    subgraph Normal Flow
        Q1[Task Queue]
        W[Worker]
        S[Success]
    end

    subgraph Error Flow
        R[Retry Queue]
        DLQ[Dead Letter Queue]
        M[Manual Review]
    end

    Q1 --> W
    W -->|Success| S
    W -->|Transient Error| R
    R -->|Retry| W
    R -->|Max Retries| DLQ
    DLQ --> M
```

```python
# celery_app/tasks/dlq.py
from celery_app import app
from celery.signals import task_failure
import json
import redis

# Redis client for DLQ storage
redis_client = redis.Redis(host='localhost', port=6379, db=3)

DLQ_KEY = 'celery:dead_letter_queue'

@app.task(ignore_result=True)
def move_to_dlq(task_name: str, task_id: str, args: list, 
                kwargs: dict, exception: str, traceback: str):
    """
    Store failed task in dead letter queue for manual review.
    
    Dead letter queues capture tasks that have exhausted all retries.
    This allows manual inspection and replay of failed tasks.
    """
    from datetime import datetime
    
    dlq_entry = {
        'task_name': task_name,
        'task_id': task_id,
        'args': args,
        'kwargs': kwargs,
        'exception': exception,
        'traceback': traceback[:5000],  # Truncate long tracebacks
        'failed_at': datetime.utcnow().isoformat(),
    }
    
    # Store in Redis sorted set with timestamp for ordering
    redis_client.zadd(
        DLQ_KEY,
        {json.dumps(dlq_entry): datetime.utcnow().timestamp()}
    )
    
    logger.warning(f"Task {task_name}[{task_id}] moved to DLQ")

@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None,
                       args=None, kwargs=None, traceback=None, 
                       einfo=None, **kw):
    """
    Global signal handler for task failures.
    Moves tasks to DLQ after max retries exceeded.
    """
    # Check if task has exceeded max retries
    if hasattr(sender, 'request') and sender.request.retries >= sender.max_retries:
        move_to_dlq.delay(
            task_name=sender.name,
            task_id=task_id,
            args=list(args) if args else [],
            kwargs=kwargs or {},
            exception=str(exception),
            traceback=str(traceback)
        )

def get_dlq_tasks(limit: int = 100):
    """Retrieve tasks from the dead letter queue."""
    tasks = redis_client.zrange(DLQ_KEY, 0, limit - 1)
    return [json.loads(t) for t in tasks]

def replay_dlq_task(task_id: str):
    """Replay a task from the dead letter queue."""
    from celery_app import app
    
    # Find task in DLQ
    tasks = get_dlq_tasks(limit=1000)
    task_entry = next((t for t in tasks if t['task_id'] == task_id), None)
    
    if not task_entry:
        raise ValueError(f"Task {task_id} not found in DLQ")
    
    # Get task function
    task_func = app.tasks.get(task_entry['task_name'])
    if not task_func:
        raise ValueError(f"Task {task_entry['task_name']} not registered")
    
    # Replay the task
    result = task_func.apply_async(
        args=task_entry['args'],
        kwargs=task_entry['kwargs']
    )
    
    # Remove from DLQ
    redis_client.zrem(DLQ_KEY, json.dumps(task_entry))
    
    return result.id
```

---

## Production Deployment

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  celery-worker-default:
    build: .
    command: celery -A celery_app worker --loglevel=info --concurrency=8 --queues=default
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G

  celery-worker-priority:
    build: .
    command: celery -A celery_app worker --loglevel=info --concurrency=4 --queues=high_priority,default
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1'
          memory: 1G

  celery-worker-analytics:
    build: .
    command: celery -A celery_app worker --loglevel=info --concurrency=2 --queues=analytics
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '4'
          memory: 4G

  celery-beat:
    build: .
    command: celery -A celery_app beat --loglevel=info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      - redis
    deploy:
      replicas: 1

  flower:
    build: .
    command: celery -A celery_app flower --port=5555
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      - redis

volumes:
  redis_data:
```

### Kubernetes Deployment

```yaml
# kubernetes/celery-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker-default
  labels:
    app: celery-worker
    queue: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
      queue: default
  template:
    metadata:
      labels:
        app: celery-worker
        queue: default
    spec:
      containers:
      - name: celery-worker
        image: myapp:latest
        command:
          - celery
          - -A
          - celery_app
          - worker
          - --loglevel=info
          - --concurrency=8
          - --queues=default
        env:
        - name: CELERY_BROKER_URL
          valueFrom:
            secretKeyRef:
              name: celery-secrets
              key: broker-url
        - name: CELERY_RESULT_BACKEND
          valueFrom:
            secretKeyRef:
              name: celery-secrets
              key: result-backend
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        livenessProbe:
          exec:
            command:
              - celery
              - -A
              - celery_app
              - inspect
              - ping
          initialDelaySeconds: 30
          periodSeconds: 60
        readinessProbe:
          exec:
            command:
              - celery
              - -A
              - celery_app
              - inspect
              - ping
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: celery-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: celery-worker-default
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: celery_queue_length
        selector:
          matchLabels:
            queue: default
      target:
        type: AverageValue
        averageValue: "100"
```

---

## Best Practices Summary

### Task Design

1. **Make tasks idempotent**: Tasks may be executed multiple times due to retries
2. **Keep tasks small**: Break large jobs into smaller tasks for better distribution
3. **Use JSON serialization**: Avoid pickle for security reasons
4. **Set appropriate timeouts**: Prevent stuck tasks from blocking workers

### Queue Management

1. **Separate queues by priority**: Ensure critical tasks are processed first
2. **Separate queues by resource needs**: Heavy tasks should not block light ones
3. **Monitor queue depth**: Detect backlogs before they become problems
4. **Set rate limits**: Protect external services and manage costs

### Reliability

1. **Enable acks_late**: Ensure tasks complete before acknowledgment
2. **Implement dead letter queues**: Capture permanently failed tasks
3. **Use retry with backoff**: Handle transient failures gracefully
4. **Monitor worker health**: Detect and recover from worker failures

### Performance

1. **Tune prefetch multiplier**: Balance between throughput and distribution
2. **Use result_expires**: Prevent result backend bloat
3. **Consider ignoring results**: When you don't need them
4. **Scale workers appropriately**: Match concurrency to workload

---

## Conclusion

Celery provides a robust foundation for distributed task processing in Python. By following these patterns for task routing, result handling, rate limiting, and monitoring, you can build reliable systems that scale to handle millions of tasks.

Key takeaways:

- **Task routing** directs work to appropriate workers
- **Result backends** store task outputs for later retrieval
- **Rate limiting** protects external services and controls costs
- **Monitoring** provides visibility into system health
- **Error handling** ensures tasks don't get lost

---

*Need comprehensive monitoring for your Celery workers? [OneUptime](https://oneuptime.com) provides queue depth tracking, worker health monitoring, and failure alerting for distributed task systems.*
