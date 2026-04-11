# How to Connect to ElastiCache Redis from ECS/EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, ECS, EKS, AWS

Description: Learn how to securely connect containerized workloads running on ECS and EKS to ElastiCache Redis using VPC networking and IAM-managed secrets.

---

Both ECS (Fargate/EC2) and EKS pods run in your VPC, so connecting to ElastiCache Redis requires proper security group rules, endpoint configuration, and secret management for the auth token.

## Security Group Setup

Allow your ECS tasks or EKS pods to reach the Redis cluster:

```bash
# Get the task security group ID
TASK_SG=sg-0abc123ecs

# Allow port 6379 from the ECS/EKS SG to the Redis SG
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123redis \
  --protocol tcp \
  --port 6379 \
  --source-group $TASK_SG
```

## ECS Task Definition

Store the auth token in AWS Secrets Manager and inject it as an environment variable:

```json
{
  "containerDefinitions": [{
    "name": "app",
    "image": "my-app:latest",
    "environment": [
      {
        "name": "REDIS_HOST",
        "value": "my-cluster.abc.cache.amazonaws.com"
      }
    ],
    "secrets": [
      {
        "name": "REDIS_AUTH_TOKEN",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:redis-token"
      }
    ]
  }],
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"]
}
```

## ECS IAM Role for Secrets Access

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue"
  ],
  "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:redis-token"
}
```

## EKS - Kubernetes Secret

Create a Kubernetes secret with the Redis connection details:

```bash
kubectl create secret generic redis-credentials \
  --from-literal=host=my-cluster.abc.cache.amazonaws.com \
  --from-literal=auth-token=MyStr0ngP@ssword
```

Use it in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: my-app:latest
        env:
        - name: REDIS_HOST
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: host
        - name: REDIS_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: auth-token
```

## Application Connection Code

```python
import redis
import os

client = redis.Redis(
    host=os.environ["REDIS_HOST"],
    port=6379,
    ssl=True,
    password=os.environ["REDIS_AUTH_TOKEN"],
    socket_connect_timeout=3,
    retry_on_timeout=True,
    decode_responses=True,
)

# Health check
client.ping()
```

## EKS Network Policy

If you use NetworkPolicy in EKS, allow egress to the ElastiCache CIDR:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-redis
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Egress
  egress:
  - ports:
    - port: 6379
      protocol: TCP
```

## Summary

ECS tasks and EKS pods connect to ElastiCache Redis through VPC-native networking. Use security group rules to control access, store the auth token in AWS Secrets Manager, and inject it via ECS secrets or Kubernetes secrets. Always enable TLS and implement connection retry logic to handle brief interruptions during failover events.
