# How to Use Dapr with AWS Fargate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Fargate, ECS, Serverless, Container

Description: Run Dapr sidecar containers on AWS Fargate for serverless container deployments, covering task networking, component injection, and health monitoring.

---

AWS Fargate runs containers without managing EC2 instances. Combined with Dapr, Fargate provides a fully serverless approach to running microservices with state management, pub/sub, and service invocation built in.

## Prerequisites

```bash
# Create ECS cluster for Fargate
aws ecs create-cluster \
  --cluster-name dapr-fargate \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1 \
  --region us-east-1

# Create VPC and subnets (or use existing)
# Fargate requires awsvpc network mode
```

## Fargate Task Definition with Dapr

```json
{
  "family": "payment-service",
  "taskRoleArn": "arn:aws:iam::123456789012:role/DaprFargateRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "payment-service",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-service:latest",
      "portMappings": [{"containerPort": 8080}],
      "environment": [
        {"name": "DAPR_HTTP_ENDPOINT", "value": "http://localhost:3500"}
      ],
      "dependsOn": [
        {"containerName": "dapr-sidecar", "condition": "HEALTHY"}
      ]
    },
    {
      "name": "dapr-sidecar",
      "image": "daprio/daprd:1.13.0",
      "command": [
        "./daprd",
        "--app-id", "payment-service",
        "--app-port", "8080",
        "--dapr-http-port", "3500",
        "--log-level", "info",
        "--resources-path", "/dapr/components"
      ],
      "portMappings": [
        {"containerPort": 3500},
        {"containerPort": 50001}
      ],
      "mountPoints": [
        {"sourceVolume": "dapr-components", "containerPath": "/dapr/components"}
      ],
      "dependsOn": [
        {"containerName": "dapr-config-init", "condition": "SUCCESS"}
      ],
      "environment": [
        {"name": "AWS_REGION", "value": "us-east-1"}
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget -q -O /dev/null http://localhost:3500/v1.0/healthz || exit 1"
        ],
        "interval": 5,
        "timeout": 3,
        "retries": 5,
        "startPeriod": 15
      }
    },
    {
      "name": "dapr-config-init",
      "image": "amazon/aws-cli:latest",
      "essential": false,
      "command": [
        "sh", "-c",
        "aws s3 cp s3://my-dapr-config/components/ /dapr/components/ --recursive"
      ],
      "mountPoints": [
        {"sourceVolume": "dapr-components", "containerPath": "/dapr/components"}
      ]
    }
  ],
  "volumes": [
    {"name": "dapr-components"}
  ]
}
```

## Create Fargate Service

```bash
aws ecs create-service \
  --cluster dapr-fargate \
  --service-name payment-service \
  --task-definition payment-service:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0abc123,subnet-0def456],
    securityGroups=[sg-0abc123],
    assignPublicIp=DISABLED
  }" \
  --region us-east-1
```

## Security Group Configuration

```bash
# Create security group for Fargate tasks
aws ec2 create-security-group \
  --group-name dapr-fargate-sg \
  --description "Dapr Fargate tasks" \
  --vpc-id vpc-0123456789abcdef0

# Allow Dapr HTTP API within the VPC
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 3500 \
  --cidr 10.0.0.0/16

# Allow Dapr gRPC within the VPC
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 50001 \
  --cidr 10.0.0.0/16
```

## Scale the Service

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/dapr-fargate/payment-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/dapr-fargate/payment-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

## Summary

Dapr on AWS Fargate combines serverless container execution with the Dapr building blocks for state, messaging, and service invocation. The key differences from ECS on EC2 are the explicit `awsvpc` networking requirement and the need to provision Dapr component configuration files via S3 or EFS since there is no host filesystem. Fargate task roles provide automatic AWS credential management without managing EC2 instance profiles.
