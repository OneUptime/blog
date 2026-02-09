# How to Use KEDA to Scale Based on AWS SQS Queue Depth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, AWS

Description: Configure KEDA to autoscale Kubernetes deployments based on AWS SQS queue depth, creating responsive worker pools that process messages efficiently while minimizing cloud costs.

---

AWS SQS queues decouple services by providing reliable message delivery. When message rates vary, you need to scale workers dynamically to maintain low queue depths and fast processing times. KEDA monitors SQS queue metrics and automatically adjusts worker replica counts to match the workload.

This autoscaling approach ensures you have enough workers to process messages quickly during peak periods while scaling down during quiet times to reduce costs. KEDA handles the complexity of querying CloudWatch and AWS SQS APIs, exposing queue depth as a standard metric that HPA can use for scaling decisions.

## Understanding SQS-Based Scaling

SQS queue depth represents messages waiting to be processed. KEDA's SQS scaler queries this metric and calculates how many worker pods are needed based on your target messages-per-pod ratio. When queue depth increases beyond the target, KEDA scales up. When it decreases, KEDA scales down.

The scaler can monitor ApproximateNumberOfMessages (visible messages) or ApproximateNumberOfMessagesNotVisible (in-flight messages being processed), or both combined to determine scaling needs.

## Setting Up AWS Credentials

Configure AWS credentials for KEDA to access SQS metrics.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-sqs-credentials
  namespace: workers
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: awsAccessKeyID
    name: aws-sqs-credentials
    key: AWS_ACCESS_KEY_ID
  - parameter: awsSecretAccessKey
    name: aws-sqs-credentials
    key: AWS_SECRET_ACCESS_KEY
```

For production environments, use IAM roles for service accounts instead of static credentials.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sqs-worker-sa
  namespace: workers
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/sqs-worker-role
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-irsa-auth
  namespace: workers
spec:
  podIdentity:
    provider: aws-eks
```

## Basic SQS Queue Scaling

Configure a ScaledObject to scale workers based on queue depth.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 2
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue
      queueLength: "10"  # Target 10 messages per pod
      awsRegion: us-east-1
      identityOwner: operator  # Use credentials from TriggerAuthentication

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 60
          policies:
          - type: Percent
            value: 100
            periodSeconds: 60
          - type: Pods
            value: 10
            periodSeconds: 60
          selectPolicy: Max

        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 20
            periodSeconds: 120
```

This configuration scales the worker deployment to maintain approximately 10 messages per pod. If 100 messages are in the queue, KEDA scales to 10 pods.

## Scaling Based on Visible and In-Flight Messages

Monitor both visible messages and those currently being processed.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: comprehensive-sqs-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: message-processor
  minReplicaCount: 3
  maxReplicaCount: 200

  triggers:
  # Scale based on visible messages
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/processing-queue
      queueLength: "15"
      awsRegion: us-east-1
      awsEndpoint: ""  # Leave empty for standard AWS endpoints
      scaleOnInFlight: "true"  # Also consider in-flight messages
      scaleIfInFlight: "true"  # Scale even if only in-flight messages exist
```

With scaleOnInFlight enabled, KEDA considers both waiting messages and messages currently being processed when calculating replica count.

## Using IAM Roles for Service Accounts

For better security on EKS, use IRSA instead of static credentials.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sqs-processor-sa
  namespace: workers
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/SQSProcessorRole
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sqs-processor
  namespace: workers
spec:
  replicas: 1  # KEDA will manage this
  selector:
    matchLabels:
      app: sqs-processor
  template:
    metadata:
      labels:
        app: sqs-processor
    spec:
      serviceAccountName: sqs-processor-sa
      containers:
      - name: processor
        image: sqs-processor:latest
        env:
        - name: QUEUE_URL
          value: https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue
        - name: AWS_REGION
          value: us-east-1
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-irsa-auth
  namespace: workers
spec:
  podIdentity:
    provider: aws-eks
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: irsa-sqs-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: sqs-processor
  minReplicaCount: 1
  maxReplicaCount: 50

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-irsa-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue
      queueLength: "20"
      awsRegion: us-east-1
      identityOwner: pod  # Use pod's service account
```

The pod's service account assumes the IAM role, eliminating the need for static credentials.

## Scaling Multiple Worker Types

Scale different worker deployments for different queues.

```yaml
# High-priority queue workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: high-priority-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: high-priority-worker
  minReplicaCount: 5  # Always maintain capacity for urgent work
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/high-priority
      queueLength: "5"  # Lower threshold for faster processing
      awsRegion: us-east-1
---
# Normal priority queue workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: normal-priority-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: normal-priority-worker
  minReplicaCount: 2
  maxReplicaCount: 50

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/normal-priority
      queueLength: "20"  # Higher threshold acceptable
      awsRegion: us-east-1
---
# Low priority queue workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: low-priority-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: low-priority-worker
  minReplicaCount: 0  # Can scale to zero
  maxReplicaCount: 30

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/low-priority
      queueLength: "50"
      awsRegion: us-east-1
      activationQueueLength: "10"  # Scale from zero when queue has 10+ messages
```

This configuration prioritizes resources for high-priority work while still processing lower-priority messages.

## Scaling to Zero for Cost Optimization

Allow workers to scale down to zero when queues are empty.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scale-to-zero-sqs
  namespace: workers
spec:
  scaleTargetRef:
    name: batch-processor
  minReplicaCount: 0  # Scale to zero when idle
  maxReplicaCount: 100

  pollingInterval: 30  # Check queue every 30 seconds
  cooldownPeriod: 300  # Wait 5 minutes before scaling to zero

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/batch-jobs
      queueLength: "10"
      awsRegion: us-east-1
      activationQueueLength: "1"  # Scale from zero even for single message
      scaleOnInFlight: "false"  # Only scale on visible messages
```

With minReplicaCount at 0 and appropriate cooldown period, workers scale to zero when the queue is empty, saving costs during idle periods.

## Handling FIFO Queues

FIFO queues have different characteristics than standard queues.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: fifo-queue-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: fifo-processor
  minReplicaCount: 3
  maxReplicaCount: 50  # FIFO throughput limits may affect scaling

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/orders.fifo
      queueLength: "10"
      awsRegion: us-east-1
      scaleOnInFlight: "false"  # FIFO handles one message group at a time

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          # Conservative scale-up for FIFO ordering
          stabilizationWindowSeconds: 120
          policies:
          - type: Pods
            value: 5
            periodSeconds: 120
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 10
            periodSeconds: 180
```

FIFO queues have throughput limits and ordering constraints that affect optimal scaling behavior.

## Monitoring SQS Scaling

Track scaling behavior and queue metrics.

```bash
# Check ScaledObject status
kubectl get scaledobject sqs-worker-scaler -n workers

# View detailed scaler info
kubectl describe scaledobject sqs-worker-scaler -n workers

# Check current replica count
kubectl get deployment sqs-worker -n workers

# View scaling events
kubectl get events -n workers --field-selector involvedObject.name=sqs-worker-scaler

# Check KEDA logs
kubectl logs -n keda deployment/keda-operator | grep sqs-worker-scaler
```

Monitor SQS metrics in CloudWatch to validate KEDA is making appropriate scaling decisions.

```bash
# Check queue depth using AWS CLI
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible
```

## Handling Dead Letter Queues

Set up separate scalers for dead letter queue processing.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dlq-processor-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: dlq-processor
  minReplicaCount: 0
  maxReplicaCount: 10  # Smaller scale for error handling

  pollingInterval: 60  # Check less frequently
  cooldownPeriod: 600  # Longer cooldown for DLQ

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-work-queue-dlq
      queueLength: "5"  # Process DLQ messages quickly
      awsRegion: us-east-1
      activationQueueLength: "1"
```

DLQ processors typically need different scaling parameters than main queue processors.

## Best Practices

Set queueLength based on your message processing time and desired latency. If each pod processes 10 messages per minute and you want queue cleared within 5 minutes, use queueLength of 50.

Configure appropriate minimum replicas to handle baseline load without delay. For time-sensitive queues, avoid scaling to zero to prevent cold start delays.

Use scaleOnInFlight carefully. For long-running message processing, including in-flight messages prevents premature scale-down. For quick processing, focus only on visible messages.

Set pollingInterval based on queue activity patterns. High-traffic queues benefit from shorter intervals (15-30 seconds). Low-traffic queues can use longer intervals (60+ seconds) to reduce API calls.

Monitor both KEDA scaling behavior and AWS SQS CloudWatch metrics. Set up alerts for high queue age or depth that persists despite scaling, indicating potential processing issues.

## Conclusion

KEDA's AWS SQS scaler enables responsive autoscaling based on actual queue depth, ensuring your worker pools process messages efficiently while minimizing costs. By configuring appropriate queue length targets and scaling policies, you build systems that automatically adapt to workload variations.

The integration between KEDA and AWS SQS creates autoscaling that directly reflects your message processing needs. Combined with proper credential management, scaling limits, and monitoring, SQS-based autoscaling helps you build cost-effective, responsive message processing systems on Kubernetes.
