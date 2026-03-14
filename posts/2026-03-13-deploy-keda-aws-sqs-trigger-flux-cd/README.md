# How to Deploy KEDA with AWS SQS Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, AWS, SQS, Autoscaling, Event-Driven

Description: Deploy KEDA with AWS SQS queue trigger for autoscaling using Flux CD to scale Kubernetes workers based on SQS queue message count.

---

## Introduction

Amazon SQS is a fully managed message queuing service used extensively in AWS-native architectures. When SQS queue depth grows, your Kubernetes workers need to scale out to process messages faster. KEDA's AWS SQS scaler monitors queue message count and triggers pod scaling automatically.

Managing KEDA SQS scalers through Flux CD means your AWS SQS queue names, queue depth thresholds, and AWS credentials are all managed as code. Scaling policy changes are pull requests with audit trails, not manual `kubectl` commands.

This guide covers configuring KEDA with the AWS SQS trigger using Flux CD, including both IAM Role for Service Accounts (IRSA) and access key authentication.

## Prerequisites

- KEDA deployed on your Kubernetes cluster (EKS or self-managed on AWS)
- An AWS SQS queue
- IAM permissions for KEDA to call `sqs:GetQueueAttributes` and `sqs:GetQueueUrl`
- Flux CD v2 bootstrapped to your Git repository

## Step 1: Configure AWS IAM for KEDA (IRSA)

On EKS, use IRSA (IAM Roles for Service Accounts) instead of static credentials:

```bash
# Create IAM policy for SQS access
aws iam create-policy \
  --policy-name KedaSQSPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789:my-task-queue"
    }]
  }'

# Associate the policy with KEDA's service account via IRSA
eksctl create iamserviceaccount \
  --name keda-operator \
  --namespace keda \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789:policy/KedaSQSPolicy \
  --approve
```

## Step 2: Create TriggerAuthentication for SQS

Using IRSA (recommended):

```yaml
# clusters/my-cluster/keda-sqs/trigger-auth-irsa.yaml
# With IRSA, KEDA uses the pod's IAM role automatically
# No secret needed - the TriggerAuthentication uses pod identity
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-auth
  namespace: app
spec:
  podIdentity:
    provider: aws-eks  # Use IRSA from EKS pod identity
```

Alternatively, using static credentials (use SOPS to encrypt):

```yaml
# clusters/my-cluster/keda-sqs/trigger-auth-static.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: app
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-auth
  namespace: app
spec:
  secretTargetRef:
    - parameter: awsAccessKeyID
      name: aws-credentials
      key: AWS_ACCESS_KEY_ID
    - parameter: awsSecretAccessKey
      name: aws-credentials
      key: AWS_SECRET_ACCESS_KEY
```

## Step 3: Create the ScaledObject for SQS

```yaml
# clusters/my-cluster/keda-sqs/scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sqs-worker
  minReplicaCount: 0
  maxReplicaCount: 25
  pollingInterval: 20
  cooldownPeriod: 120
  triggers:
    - type: aws-sqs-queue
      metadata:
        # Full SQS queue URL
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-task-queue
        # AWS region
        queueLength: "5"
        # Scale 1 replica per N messages visible in the queue
        awsRegion: us-east-1
        # Include messages in-flight when calculating queue depth
        scaleOnInFlight: "true"
      authenticationRef:
        name: aws-sqs-auth
```

## Step 4: Deploy the SQS Worker

```yaml
# clusters/my-cluster/keda-sqs/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sqs-worker
  namespace: app
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
      serviceAccountName: sqs-worker-sa  # Annotated with IRSA role
      containers:
        - name: worker
          image: myregistry/sqs-worker:v1.1.0
          env:
            - name: SQS_QUEUE_URL
              value: "https://sqs.us-east-1.amazonaws.com/123456789/my-task-queue"
            - name: AWS_REGION
              value: "us-east-1"
            - name: MAX_MESSAGES
              value: "10"
            - name: VISIBILITY_TIMEOUT
              value: "30"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          # Allow graceful shutdown to finish processing current messages
          terminationGracePeriodSeconds: 60
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/keda-sqs/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - trigger-auth-irsa.yaml
  - worker-deployment.yaml
  - scaledobject.yaml
---
# clusters/my-cluster/flux-kustomization-keda-sqs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-sqs
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-sqs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify SQS-Based Scaling

```bash
# Check ScaledObject status
kubectl get scaledobject sqs-worker-scaler -n app -w

# Send test messages to SQS to trigger scaling
aws sqs send-message-batch \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-task-queue \
  --entries '[{"Id":"1","MessageBody":"task1"},{"Id":"2","MessageBody":"task2"}]'

# Watch workers scale up
kubectl get pods -n app -l app=sqs-worker -w

# Monitor SQS queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-task-queue \
  --attribute-names ApproximateNumberOfMessages
```

## Best Practices

- Always prefer IRSA over static credentials on EKS — it eliminates credential rotation overhead and follows the principle of least privilege.
- Enable `scaleOnInFlight: "true"` to include in-flight messages in the queue depth calculation, preventing KEDA from scaling down while messages are being processed.
- Set `queueLength` (messages per replica) based on your worker's throughput and your desired processing latency SLA.
- Configure SQS message visibility timeout longer than your worker's maximum processing time to prevent double-processing during scale-down.
- Use a SQS dead-letter queue (DLQ) and set up CloudWatch alarms on DLQ depth — failed messages that land in the DLQ do not count toward KEDA's queue depth metric.

## Conclusion

KEDA with the AWS SQS trigger managed by Flux CD provides an automated, GitOps-governed approach to SQS-driven worker scaling. Queue depth thresholds, AWS authentication, and scaling bounds are all version-controlled, enabling your team to tune autoscaling behavior through pull requests and ensuring the cluster self-heals any configuration drift.
