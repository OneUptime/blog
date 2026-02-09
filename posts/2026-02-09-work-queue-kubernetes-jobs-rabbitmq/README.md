# How to Implement Work Queue Patterns with Kubernetes Jobs and RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, RabbitMQ, Queue

Description: Learn how to build reliable work queue patterns using Kubernetes Jobs and RabbitMQ for distributed task processing with advanced messaging features.

---

RabbitMQ brings enterprise-grade messaging capabilities to work queue patterns in Kubernetes. Unlike simple Redis lists, RabbitMQ provides message acknowledgments, dead letter exchanges, priority queues, and sophisticated routing. This makes it ideal for complex batch processing scenarios where message reliability is critical.

When you need guaranteed message delivery, the ability to route messages based on content, or built-in retry mechanisms, RabbitMQ is the right choice. Combined with Kubernetes Jobs, it creates a powerful platform for reliable distributed processing.

## Deploying RabbitMQ

Start with a production-ready RabbitMQ deployment:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
spec:
  ports:
  - port: 5672
    name: amqp
  - port: 15672
    name: management
  selector:
    app: rabbitmq
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
spec:
  serviceName: rabbitmq
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management-alpine
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "admin"
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
        volumeMounts:
        - name: rabbitmq-data
          mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
  - metadata:
      name: rabbitmq-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-secret
stringData:
  password: "change-this-password"
```

This gives you a persistent RabbitMQ instance with the management UI available at port 15672 for monitoring.

## Setting Up Queues and Exchanges

Configure RabbitMQ with proper queues and dead letter handling:

```python
#!/usr/bin/env python3
import pika
import json

def setup_rabbitmq():
    """Configure RabbitMQ queues and exchanges"""

    # Connect to RabbitMQ
    credentials = pika.PlainCredentials('admin', 'change-this-password')
    parameters = pika.ConnectionParameters(
        host='rabbitmq',
        port=5672,
        credentials=credentials
    )
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Declare dead letter exchange for failed messages
    channel.exchange_declare(
        exchange='dlx',
        exchange_type='direct',
        durable=True
    )

    # Declare dead letter queue
    channel.queue_declare(
        queue='failed-tasks',
        durable=True
    )

    # Bind dead letter queue to exchange
    channel.queue_bind(
        queue='failed-tasks',
        exchange='dlx',
        routing_key='failed'
    )

    # Declare main work queue with dead letter configuration
    channel.queue_declare(
        queue='work-queue',
        durable=True,
        arguments={
            'x-dead-letter-exchange': 'dlx',
            'x-dead-letter-routing-key': 'failed',
            'x-max-priority': 10  # Enable priority queue
        }
    )

    # Declare results queue
    channel.queue_declare(
        queue='results-queue',
        durable=True
    )

    print("RabbitMQ configured successfully")
    connection.close()

if __name__ == "__main__":
    setup_rabbitmq()
```

Run this as an init job before starting workers:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: setup-rabbitmq
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: setup
        image: rabbitmq-setup:latest
        command: ["python3", "/app/setup_rabbitmq.py"]
```

## Publishing Work Items

Create a producer that publishes tasks to the queue:

```python
#!/usr/bin/env python3
import pika
import json
import sys

def publish_tasks(tasks):
    """Publish work items to RabbitMQ"""

    credentials = pika.PlainCredentials('admin', 'change-this-password')
    parameters = pika.ConnectionParameters(
        host='rabbitmq',
        port=5672,
        credentials=credentials
    )
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    published = 0

    for task in tasks:
        message = json.dumps(task)

        # Determine priority (higher priority tasks processed first)
        priority = task.get('priority', 5)

        # Publish with persistence and priority
        channel.basic_publish(
            exchange='',
            routing_key='work-queue',
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
                priority=priority,
                content_type='application/json'
            )
        )
        published += 1

        if published % 100 == 0:
            print(f"Published {published} tasks")

    connection.close()
    print(f"Total published: {published} tasks")
    return published

def main():
    # Generate work items
    tasks = []

    # High priority tasks
    for i in range(100):
        tasks.append({
            'id': f'urgent-{i}',
            'type': 'urgent-processing',
            'data': {'file': f'urgent/file-{i}.csv'},
            'priority': 9
        })

    # Normal priority tasks
    for i in range(900):
        tasks.append({
            'id': f'normal-{i}',
            'type': 'normal-processing',
            'data': {'file': f'data/file-{i}.csv'},
            'priority': 5
        })

    count = publish_tasks(tasks)
    print(f"Published {count} tasks to queue")

if __name__ == "__main__":
    main()
```

## Implementing Worker Jobs

Create workers that consume messages with proper acknowledgment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rabbitmq-workers
spec:
  completions: 1000
  parallelism: 50
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: rabbitmq-worker:latest
        env:
        - name: RABBITMQ_HOST
          value: "rabbitmq"
        - name: RABBITMQ_USER
          value: "admin"
        - name: RABBITMQ_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
        command: ["python3", "/app/worker.py"]
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
```

## Building the Worker

The worker uses acknowledgments to ensure reliable message processing:

```python
#!/usr/bin/env python3
import pika
import json
import sys
import time
import traceback
import os

def process_task(task):
    """Process a single task"""
    print(f"Processing task {task['id']}: {task['type']}")

    # Simulate processing based on task type
    if task['type'] == 'urgent-processing':
        time.sleep(1)  # Fast processing
    else:
        time.sleep(3)  # Normal processing

    result = {
        'task_id': task['id'],
        'status': 'completed',
        'processed_at': time.time()
    }

    print(f"Completed task {task['id']}")
    return result

def publish_result(channel, result):
    """Publish result to results queue"""
    message = json.dumps(result)

    channel.basic_publish(
        exchange='',
        routing_key='results-queue',
        body=message,
        properties=pika.BasicProperties(
            delivery_mode=2,
            content_type='application/json'
        )
    )

def main():
    # Get credentials from environment
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
    rabbitmq_user = os.getenv('RABBITMQ_USER', 'admin')
    rabbitmq_pass = os.getenv('RABBITMQ_PASS', 'change-this-password')

    # Connect to RabbitMQ
    credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_pass)
    parameters = pika.ConnectionParameters(
        host=rabbitmq_host,
        port=5672,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Set QoS to only receive one message at a time
    channel.basic_qos(prefetch_count=1)

    # Get one message
    method_frame, header_frame, body = channel.basic_get(queue='work-queue')

    if method_frame is None:
        print("No work available")
        connection.close()
        sys.exit(0)

    try:
        # Parse task
        task = json.loads(body)

        # Process the task
        result = process_task(task)

        # Publish result
        publish_result(channel, result)

        # Acknowledge message (this removes it from queue)
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)

        print(f"Successfully processed and acknowledged task {task['id']}")

        connection.close()
        sys.exit(0)

    except Exception as e:
        print(f"Error processing task: {e}")
        traceback.print_exc()

        # Reject message and send to dead letter queue
        # requeue=False means it goes to DLX instead of back to main queue
        channel.basic_nack(
            delivery_tag=method_frame.delivery_tag,
            requeue=False
        )

        print("Message sent to dead letter queue")

        connection.close()
        sys.exit(1)

if __name__ == "__main__":
    main()
```

The critical feature here is message acknowledgment. Workers only acknowledge messages after successful processing. Failed messages automatically go to the dead letter queue for later investigation.

## Implementing Retry Logic

For transient failures, implement retry logic with exponential backoff:

```python
#!/usr/bin/env python3
import pika
import json
import sys
import time
import os

MAX_RETRIES = 3

def get_retry_count(headers):
    """Get retry count from message headers"""
    if headers and 'x-retry-count' in headers:
        return headers['x-retry-count']
    return 0

def process_with_retry(task):
    """Process task, raising exception on transient failures"""
    try:
        # Your processing logic
        process_task(task)
        return True

    except TransientError as e:
        # Retriable error
        raise e

    except PermanentError as e:
        # Non-retriable error
        print(f"Permanent error: {e}")
        return False

def main():
    credentials = pika.PlainCredentials(
        os.getenv('RABBITMQ_USER', 'admin'),
        os.getenv('RABBITMQ_PASS', 'change-this-password')
    )
    parameters = pika.ConnectionParameters(
        host=os.getenv('RABBITMQ_HOST', 'rabbitmq'),
        credentials=credentials
    )

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.basic_qos(prefetch_count=1)

    method_frame, properties, body = channel.basic_get(queue='work-queue')

    if method_frame is None:
        print("No work available")
        connection.close()
        sys.exit(0)

    try:
        task = json.loads(body)
        retry_count = get_retry_count(properties.headers)

        # Attempt processing
        if process_with_retry(task):
            # Success
            channel.basic_ack(delivery_tag=method_frame.delivery_tag)
            print(f"Task {task['id']} completed")
            connection.close()
            sys.exit(0)
        else:
            # Permanent failure, send to DLX
            channel.basic_nack(
                delivery_tag=method_frame.delivery_tag,
                requeue=False
            )
            connection.close()
            sys.exit(1)

    except TransientError as e:
        # Retriable error
        if retry_count < MAX_RETRIES:
            # Re-publish with incremented retry count
            headers = properties.headers or {}
            headers['x-retry-count'] = retry_count + 1

            # Calculate backoff delay
            delay = 1000 * (2 ** retry_count)  # Exponential backoff in ms

            # Re-publish to delayed queue (requires rabbitmq-delayed-message-exchange plugin)
            channel.basic_publish(
                exchange='',
                routing_key='work-queue',
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    headers=headers,
                    priority=properties.priority
                )
            )

            # Acknowledge original message
            channel.basic_ack(delivery_tag=method_frame.delivery_tag)

            print(f"Transient error, retry {retry_count + 1}/{MAX_RETRIES} queued")
            connection.close()
            sys.exit(0)
        else:
            # Max retries exceeded, send to DLX
            channel.basic_nack(
                delivery_tag=method_frame.delivery_tag,
                requeue=False
            )
            print("Max retries exceeded, sent to DLX")
            connection.close()
            sys.exit(1)

if __name__ == "__main__":
    main()
```

## Monitoring Queue Depth

Monitor RabbitMQ queues to track progress:

```python
#!/usr/bin/env python3
import requests
import time
import os

def get_queue_stats():
    """Get statistics from RabbitMQ management API"""
    base_url = "http://rabbitmq:15672/api"
    auth = ('admin', os.getenv('RABBITMQ_PASS', 'change-this-password'))

    response = requests.get(f"{base_url}/queues", auth=auth)
    queues = response.json()

    stats = {}
    for queue in queues:
        stats[queue['name']] = {
            'messages': queue.get('messages', 0),
            'messages_ready': queue.get('messages_ready', 0),
            'messages_unacknowledged': queue.get('messages_unacknowledged', 0),
            'consumers': queue.get('consumers', 0)
        }

    return stats

def monitor_progress():
    """Monitor queue processing progress"""
    start_time = time.time()
    initial_count = None

    while True:
        stats = get_queue_stats()

        work_queue = stats.get('work-queue', {})
        failed_queue = stats.get('failed-tasks', {})
        results_queue = stats.get('results-queue', {})

        remaining = work_queue.get('messages_ready', 0)
        processing = work_queue.get('messages_unacknowledged', 0)
        failed = failed_queue.get('messages', 0)
        completed = results_queue.get('messages', 0)

        if initial_count is None:
            initial_count = remaining + processing

        # Calculate progress
        processed = initial_count - remaining - processing
        progress = (processed / initial_count * 100) if initial_count > 0 else 0

        # Calculate rate
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0

        # Estimate completion
        if rate > 0 and remaining > 0:
            eta_seconds = remaining / rate
            eta_str = f"{eta_seconds / 60:.1f} minutes"
        else:
            eta_str = "unknown"

        print(f"Ready: {remaining} | Processing: {processing} | "
              f"Completed: {completed} | Failed: {failed} | "
              f"Progress: {progress:.1f}% | Rate: {rate:.2f}/sec | ETA: {eta_str}")

        if remaining == 0 and processing == 0:
            print("All tasks processed")
            break

        time.sleep(5)

if __name__ == "__main__":
    monitor_progress()
```

## Collecting Results

Consume results from the results queue:

```python
#!/usr/bin/env python3
import pika
import json

def collect_results():
    """Collect all results from results queue"""
    credentials = pika.PlainCredentials('admin', 'change-this-password')
    parameters = pika.ConnectionParameters(host='rabbitmq', credentials=credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    results = []

    while True:
        method_frame, properties, body = channel.basic_get(queue='results-queue')

        if method_frame is None:
            break

        result = json.loads(body)
        results.append(result)

        channel.basic_ack(delivery_tag=method_frame.delivery_tag)

    connection.close()

    print(f"Collected {len(results)} results")

    # Save to file
    with open('/output/results.json', 'w') as f:
        json.dump(results, f, indent=2)

    return results

if __name__ == "__main__":
    collect_results()
```

## Handling Failed Messages

Process messages from the dead letter queue:

```python
#!/usr/bin/env python3
import pika
import json

def inspect_failures():
    """Inspect and report on failed messages"""
    credentials = pika.PlainCredentials('admin', 'change-this-password')
    parameters = pika.ConnectionParameters(host='rabbitmq', credentials=credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    failed_count = 0
    failures = []

    while True:
        method_frame, properties, body = channel.basic_get(queue='failed-tasks')

        if method_frame is None:
            break

        task = json.loads(body)
        failures.append({
            'task': task,
            'headers': properties.headers
        })

        failed_count += 1

        # Acknowledge to remove from DLQ
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)

    connection.close()

    print(f"Found {failed_count} failed tasks")

    # Save failures for investigation
    with open('/output/failures.json', 'w') as f:
        json.dump(failures, f, indent=2)

    return failures

if __name__ == "__main__":
    inspect_failures()
```

RabbitMQ provides robust messaging features that make work queue patterns more reliable and feature-rich than simple Redis-based queues. Use it when you need guaranteed delivery, sophisticated routing, or built-in retry mechanisms for your batch processing workloads.
