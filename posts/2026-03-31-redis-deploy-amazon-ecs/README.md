# How to Deploy Redis with Amazon ECS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AWS, ECS, Fargate, Deployment

Description: Deploy a self-managed Redis container on Amazon ECS Fargate with EFS persistent storage, health checks, and ECS Service Connect for service discovery.

---

While AWS ElastiCache is the managed Redis option on AWS, running Redis on ECS Fargate gives you direct control over configuration, version selection, and cost for smaller workloads. This guide covers a production-ready ECS deployment with persistent storage via EFS.

## Task Definition

Define the Redis task with resource limits and health checks using the AWS CLI or CloudFormation:

```json
{
  "family": "redis",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "redis",
      "image": "redis:7-alpine",
      "portMappings": [
        {
          "containerPort": 6379,
          "protocol": "tcp",
          "name": "redis"
        }
      ],
      "command": [
        "redis-server",
        "--requirepass", "REDIS_PASSWORD_FROM_SECRET",
        "--maxmemory", "512mb",
        "--maxmemory-policy", "allkeys-lru",
        "--appendonly", "yes",
        "--dir", "/data"
      ],
      "mountPoints": [
        {
          "sourceVolume": "redis-data",
          "containerPath": "/data",
          "readOnly": false
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "redis-cli -a REDIS_PASSWORD_FROM_SECRET --no-auth-warning ping || exit 1"],
        "interval": 10,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 15
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/redis",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "redis"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "redis-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-XXXXXXXX",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

## Deploy with AWS CLI

```bash
# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://redis-task-def.json

# Create or update the ECS service
aws ecs create-service \
  --cluster my-cluster \
  --service-name redis \
  --task-definition redis \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxx],
    securityGroups=[sg-xxx],
    assignPublicIp=DISABLED
  }"
```

## Security Group Rules

Redis should never be publicly accessible. Allow only your application tasks:

```bash
# Allow app security group to reach Redis on 6379
aws ec2 authorize-security-group-ingress \
  --group-id sg-REDIS_SG \
  --protocol tcp \
  --port 6379 \
  --source-group sg-APP_SG
```

## Service Connect Configuration

Use ECS Service Connect for internal DNS-based service discovery:

```json
{
  "serviceConnectConfiguration": {
    "enabled": true,
    "namespace": "my-app",
    "services": [
      {
        "portName": "redis",
        "discoveryName": "redis",
        "clientAliases": [{"port": 6379, "dnsName": "redis"}]
      }
    ]
  }
}
```

Application containers then connect via `redis://redis:6379`.

## Monitoring

```bash
# Check service events
aws ecs describe-services \
  --cluster my-cluster \
  --services redis \
  --query "services[0].events[:5]"

# View CloudWatch logs
aws logs tail /ecs/redis --follow
```

## Summary

Redis on ECS Fargate provides self-managed Redis without EC2 instance management. EFS volumes persist data across task restarts, awsvpc networking keeps Redis off the public internet, and ECS Service Connect provides simple DNS-based discovery. Health checks ensure ECS replaces unhealthy tasks automatically.
