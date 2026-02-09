# How to Configure KEDA ScaledObjects for RabbitMQ and SQS Queue-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KEDA, Kubernetes, RabbitMQ, AWS-SQS, Auto-Scaling

Description: Configure KEDA to auto-scale Kubernetes workloads based on RabbitMQ and AWS SQS queue metrics for efficient queue processing and resource utilization.

---

Queue-based scaling is one of the most powerful patterns for building responsive systems that handle variable workloads efficiently. KEDA provides native scalers for RabbitMQ and AWS SQS that monitor queue depth and automatically adjust pod counts to match demand. This guide shows you how to configure both scalers for production workloads.

## Understanding Queue-Based Scaling

Traditional CPU and memory-based autoscaling doesn't work well for queue consumers. A pod might be idle (low CPU) but a queue could have millions of backlogged messages. Queue-based scaling solves this by scaling based on the actual workload waiting to be processed.

KEDA periodically queries queue metrics and compares them to configured thresholds. When queue depth exceeds the target, KEDA scales up workers. When queues drain, it scales back down. This ensures you have enough capacity to process messages without overprovisioning resources.

The key metric is messages per pod. If you configure a threshold of 10 messages per pod and there are 100 messages in the queue, KEDA scales to 10 pods. This simple calculation ensures consistent processing throughput.

## Configuring RabbitMQ Scaling

First, deploy RabbitMQ on Kubernetes:

```bash
# Deploy RabbitMQ using operator
kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml

# Create RabbitMQ cluster
cat <<EOF | kubectl apply -f -
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq
  namespace: default
spec:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi
  rabbitmq:
    additionalConfig: |
      consumer_timeout = 3600000
EOF

# Wait for cluster to be ready
kubectl wait --for=condition=Ready rabbitmqcluster/rabbitmq --timeout=300s
```

Create a worker deployment that consumes from RabbitMQ:

```python
# rabbitmq_worker.py
import pika
import json
import time
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', '5672'))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'guest')
QUEUE_NAME = os.getenv('QUEUE_NAME', 'tasks')

def process_message(body):
    """Process a single message"""
    try:
        data = json.loads(body)
        task_id = data.get('task_id')
        task_type = data.get('type')

        logger.info(f"Processing task {task_id} of type {task_type}")

        # Simulate processing time
        processing_time = data.get('processing_time', 2)
        time.sleep(processing_time)

        logger.info(f"Completed task {task_id}")
        return True

    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return False

def main():
    """Main consumer loop"""

    # Connect to RabbitMQ
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Declare queue (idempotent)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    # Set QoS - process one message at a time
    channel.basic_qos(prefetch_count=1)

    logger.info(f"Worker started, consuming from {QUEUE_NAME}")

    def callback(ch, method, properties, body):
        success = process_message(body)

        if success:
            ch.basic_ack(delivery_tag=method.delivery_tag)
        else:
            # Reject and requeue for retry
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
        connection.close()

if __name__ == '__main__':
    main()
```

Deploy the worker:

```yaml
# rabbitmq-worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-worker
  namespace: default
spec:
  replicas: 1  # KEDA will manage this
  selector:
    matchLabels:
      app: rabbitmq-worker
  template:
    metadata:
      labels:
        app: rabbitmq-worker
    spec:
      containers:
      - name: worker
        image: your-registry/rabbitmq-worker:latest
        env:
        - name: RABBITMQ_HOST
          value: "rabbitmq.default.svc.cluster.local"
        - name: RABBITMQ_USER
          valueFrom:
            secretKeyRef:
              name: rabbitmq-default-user
              key: username
        - name: RABBITMQ_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rabbitmq-default-user
              key: password
        - name: QUEUE_NAME
          value: "tasks"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Configure KEDA RabbitMQ scaler:

```yaml
# rabbitmq-scaledobject.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-consumer-secret
type: Opaque
stringData:
  host: "amqp://guest:guest@rabbitmq.default.svc.cluster.local:5672/"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-trigger-auth
  namespace: default
spec:
  secretTargetRef:
  - parameter: host
    name: rabbitmq-consumer-secret
    key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-worker

  pollingInterval: 10   # Check every 10 seconds
  cooldownPeriod: 30    # Wait 30s before scaling down
  minReplicaCount: 0    # Scale to zero when queue is empty
  maxReplicaCount: 50   # Maximum 50 pods

  triggers:
  - type: rabbitmq
    authenticationRef:
      name: rabbitmq-trigger-auth
    metadata:
      protocol: auto
      queueName: tasks
      mode: QueueLength
      value: "10"  # Target 10 messages per pod

      # Optional: use message rate instead of queue length
      # mode: MessageRate
      # value: "100"  # Target 100 messages/sec per pod
```

Apply the configuration:

```bash
kubectl apply -f rabbitmq-worker-deployment.yaml
kubectl apply -f rabbitmq-scaledobject.yaml

# Verify ScaledObject
kubectl get scaledobject rabbitmq-worker-scaler

# Check HPA created by KEDA
kubectl get hpa
```

## Configuring AWS SQS Scaling

Set up AWS credentials for KEDA:

```yaml
# aws-credentials-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: default
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
  AWS_REGION: "us-east-1"
```

Or use IAM Roles for Service Accounts (IRSA) for better security:

```yaml
# sqs-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sqs-worker-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/KEDASQSWorkerRole
```

Create an SQS consumer:

```javascript
// sqs-worker/server.js
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const QUEUE_URL = process.env.QUEUE_URL;
const MAX_MESSAGES = 10;
const WAIT_TIME = 20; // Long polling

async function processMessage(message) {
  console.log(`Processing message: ${message.MessageId}`);

  try {
    const body = JSON.parse(message.Body);

    // Your business logic here
    await handleTask(body);

    console.log(`Completed message: ${message.MessageId}`);
    return true;

  } catch (error) {
    console.error(`Error processing message: ${error.message}`);
    return false;
  }
}

async function handleTask(task) {
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Task processed:', task);
}

async function pollQueue() {
  while (true) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: MAX_MESSAGES,
        WaitTimeSeconds: WAIT_TIME,
        VisibilityTimeout: 60
      });

      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        console.log(`Received ${response.Messages.length} messages`);

        for (const message of response.Messages) {
          const success = await processMessage(message);

          if (success) {
            // Delete message from queue
            await sqsClient.send(new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle
            }));
          }
          // If processing failed, message becomes visible again after timeout
        }
      }

    } catch (error) {
      console.error('Polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

console.log(`SQS Worker starting, queue: ${QUEUE_URL}`);
pollQueue();
```

Deploy the SQS worker:

```yaml
# sqs-worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sqs-worker
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sqs-worker
  template:
    metadata:
      labels:
        app: sqs-worker
    spec:
      serviceAccountName: sqs-worker-sa  # For IRSA
      containers:
      - name: worker
        image: your-registry/sqs-worker:latest
        env:
        - name: QUEUE_URL
          value: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"
        - name: AWS_REGION
          value: "us-east-1"
        # Only needed if not using IRSA
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: AWS_SECRET_ACCESS_KEY
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

Configure KEDA SQS scaler:

```yaml
# sqs-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: sqs-trigger-auth
  namespace: default
spec:
  # Use pod identity (IRSA)
  podIdentity:
    provider: aws-eks

  # Or use secrets
  # secretTargetRef:
  # - parameter: awsAccessKeyID
  #   name: aws-credentials
  #   key: AWS_ACCESS_KEY_ID
  # - parameter: awsSecretAccessKey
  #   name: aws-credentials
  #   key: AWS_SECRET_ACCESS_KEY
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: sqs-worker

  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1    # Keep at least 1 pod running
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: sqs-trigger-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
      queueLength: "5"  # Target 5 messages per pod
      awsRegion: us-east-1

      # Optional: scale based on message age
      # scaleOnInFlight: "false"
      # scaleDelayInSeconds: "30"
```

## Multi-Queue Scaling

Scale based on multiple queues:

```yaml
# multi-queue-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: multi-queue-worker-scaler
spec:
  scaleTargetRef:
    name: multi-queue-worker

  pollingInterval: 10
  cooldownPeriod: 30
  minReplicaCount: 1
  maxReplicaCount: 50

  triggers:
  # High priority queue
  - type: rabbitmq
    authenticationRef:
      name: rabbitmq-trigger-auth
    metadata:
      queueName: high-priority
      value: "5"  # Scale aggressively

  # Normal priority queue
  - type: rabbitmq
    authenticationRef:
      name: rabbitmq-trigger-auth
    metadata:
      queueName: normal-priority
      value: "20"

  # Low priority queue
  - type: rabbitmq
    authenticationRef:
      name: rabbitmq-trigger-auth
    metadata:
      queueName: low-priority
      value: "50"
```

## Advanced Scaling Strategies

Implement time-based scaling:

```yaml
# time-aware-scaling.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: business-hours-scaler
spec:
  scaleTargetRef:
    name: sqs-worker

  pollingInterval: 30
  cooldownPeriod: 120

  # Scale to zero outside business hours
  minReplicaCount: 0
  maxReplicaCount: 100

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 50
            periodSeconds: 60

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: sqs-trigger-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/queue
      queueLength: "10"
      awsRegion: us-east-1

  # Use Cron scaler to enforce minimum during business hours
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 9 * * 1-5    # 9 AM Mon-Fri
      end: 0 18 * * 1-5     # 6 PM Mon-Fri
      desiredReplicas: "5"  # Minimum 5 during business hours
```

## Monitoring Queue-Based Scaling

Track scaling metrics:

```bash
# Check ScaledObject status
kubectl describe scaledobject rabbitmq-worker-scaler

# View HPA metrics
kubectl get hpa rabbitmq-worker-scaler -o yaml

# Check queue depth
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/default/s0-rabbitmq-tasks" | jq .

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator
```

Create Grafana dashboards:

```promql
# Current replica count
keda_scaler_active{scaledObject="rabbitmq-worker-scaler"}

# Queue depth
keda_scaler_metrics_value{scaledObject="rabbitmq-worker-scaler"}

# Scaling events
rate(keda_scaler_errors_total[5m])

# Messages per pod
(
  keda_scaler_metrics_value
  /
  keda_scaler_active
)
```

## Best Practices

Set appropriate queue length targets. Too low causes frequent scaling, too high leaves messages waiting. Start with 10-20 messages per pod and adjust based on processing time.

Configure reasonable cooldown periods. Longer cooldowns reduce scaling churn but delay scale-down. Match cooldown to your average message processing time.

Use min replicas for critical queues. Scaling from zero adds latency. Keep at least one pod running for queues that need immediate processing.

Monitor message age. If messages wait too long despite scaling, increase max replicas or optimize processing logic.

Handle visibility timeouts properly. Ensure messages are acknowledged or deleted before visibility timeout expires to prevent reprocessing.

Test failure scenarios. Verify your system handles pod crashes, network issues, and message processing failures gracefully.

## Conclusion

Queue-based scaling with KEDA provides an efficient way to match processing capacity to actual workload. By monitoring queue depth in RabbitMQ or SQS, KEDA ensures you have enough workers to process messages promptly without overprovisioning resources. The ability to scale to zero during idle periods dramatically reduces costs while maintaining responsiveness when work arrives. Combined with proper monitoring and tuning, queue-based scaling delivers both operational efficiency and reliable message processing.
