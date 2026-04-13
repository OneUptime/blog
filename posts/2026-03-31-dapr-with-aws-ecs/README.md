# How to Use Dapr with AWS ECS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, ECS, Container, Sidecar, Deployment

Description: Deploy Dapr as a sidecar container in AWS ECS task definitions to enable state management, pub/sub, and service invocation for containerized microservices.

---

AWS Elastic Container Service (ECS) supports multi-container task definitions, making it straightforward to run Dapr as a sidecar alongside your application. Unlike Kubernetes, there is no automatic injection - you configure the Dapr sidecar container directly in the task definition.

## ECS Task Role IAM Policy

```bash
# Create task role for Dapr components
aws iam create-role \
  --role-name DaprECSTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach permissions for DynamoDB (example)
aws iam put-role-policy \
  --role-name DaprECSTaskRole \
  --policy-name DaprPermissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/dapr-state"
    }]
  }'
```

## ECS Task Definition with Dapr Sidecar

```json
{
  "family": "order-service",
  "taskRoleArn": "arn:aws:iam::123456789012:role/DaprECSTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "order-service",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service:latest",
      "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
      "environment": [
        {"name": "APP_PORT", "value": "8080"},
        {"name": "DAPR_HTTP_PORT", "value": "3500"}
      ],
      "dependsOn": [{"containerName": "dapr-sidecar", "condition": "HEALTHY"}],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/order-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "app"
        }
      }
    },
    {
      "name": "dapr-sidecar",
      "image": "daprio/daprd:1.13.0",
      "entryPoint": ["/daprd"],
      "command": [
        "--app-id", "order-service",
        "--app-port", "8080",
        "--dapr-http-port", "3500",
        "--dapr-grpc-port", "50001",
        "--log-level", "info",
        "--components-path", "/components",
        "--config", "/config/config.yaml"
      ],
      "portMappings": [
        {"containerPort": 3500, "protocol": "tcp"},
        {"containerPort": 50001, "protocol": "tcp"}
      ],
      "mountPoints": [
        {"sourceVolume": "dapr-components", "containerPath": "/components"},
        {"sourceVolume": "dapr-config", "containerPath": "/config"}
      ],
      "healthCheck": {
        "command": ["CMD", "curl", "-f", "http://localhost:3500/v1.0/healthz"],
        "interval": 5,
        "timeout": 3,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/order-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "dapr"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "dapr-components",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-EXAMPLE",
        "rootDirectory": "/dapr/components"
      }
    },
    {
      "name": "dapr-config",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-EXAMPLE",
        "rootDirectory": "/dapr/config"
      }
    }
  ]
}
```

## Mount Dapr Components via AWS EFS

```bash
# Create EFS filesystem for Dapr configuration
aws efs create-file-system \
  --performance-mode generalPurpose \
  --tags Key=Name,Value=dapr-config \
  --region us-east-1

# Mount and upload component files
# /efs/dapr/components/statestore.yaml
# /efs/dapr/config/config.yaml
```

## Verify Sidecar Health

```bash
# Check ECS task status
aws ecs describe-tasks \
  --cluster my-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789012:task/my-cluster/abc123 \
  --query "tasks[0].containers[*].{Name:name,Status:lastStatus,Health:healthStatus}"
```

## Summary

Running Dapr on ECS requires explicitly defining the `dapr-sidecar` container in the task definition alongside your application container. The sidecar starts before the app via `dependsOn`, and a health check on the Dapr HTTP port ensures the sidecar is ready before traffic is routed. Using an ECS task role for AWS credentials eliminates the need for long-lived access keys in component configurations.
