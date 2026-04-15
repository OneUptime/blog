# How to Use Dapr with AWS ECS Anywhere

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, ECS Anywhere, Container, Edge

Description: Run Dapr microservices on AWS ECS Anywhere by deploying daprd as a sidecar container in ECS task definitions on on-premises or edge infrastructure.

---

AWS ECS Anywhere allows you to run ECS workloads on your own infrastructure while using AWS for orchestration. Dapr runs on ECS Anywhere using the self-hosted mode, with `daprd` as a sidecar container in each ECS task definition.

## Registering an On-Premises Instance

Register your on-premises server as an ECS Anywhere external instance:

```bash
# Download and run the ECS Anywhere install script on the server
curl -o install.sh https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install-latest.sh

# Run with your cluster name and activation credentials
sudo bash install.sh \
  --region us-east-1 \
  --cluster my-dapr-cluster \
  --activation-id <ACTIVATION_ID> \
  --activation-code <ACTIVATION_CODE>

# Verify the instance appears in ECS
aws ecs list-container-instances \
  --cluster my-dapr-cluster \
  --filter "attribute:ecs.os-type == linux"
```

## ECS Task Definition with Dapr Sidecar

Define an ECS task with both the application and Dapr sidecar containers:

```json
{
  "family": "order-service-dapr",
  "networkMode": "host",
  "requiresCompatibilities": ["EXTERNAL"],
  "containerDefinitions": [
    {
      "name": "order-service",
      "image": "myrepo/order-service:1.0.0",
      "essential": true,
      "portMappings": [
        {"containerPort": 8080, "hostPort": 8080}
      ],
      "environment": [
        {"name": "DAPR_HTTP_PORT", "value": "3500"},
        {"name": "DAPR_GRPC_PORT", "value": "50001"}
      ],
      "dependsOn": [
        {"containerName": "daprd", "condition": "HEALTHY"}
      ]
    },
    {
      "name": "daprd",
      "image": "daprio/daprd:1.17.4",
      "essential": false,
      "command": [
        "./daprd",
        "--app-id", "order-service",
        "--app-port", "8080",
        "--dapr-http-port", "3500",
        "--dapr-grpc-port", "50001",
        "--resources-path", "/dapr/components",
        "--log-level", "info"
      ],
      "portMappings": [
        {"containerPort": 3500, "hostPort": 3500},
        {"containerPort": 50001, "hostPort": 50001}
      ],
      "mountPoints": [
        {
          "sourceVolume": "dapr-components",
          "containerPath": "/dapr/components"
        }
      ],
      "healthCheck": {
        "command": ["CMD", "wget", "-qO-", "http://localhost:3500/v1.0/healthz"],
        "interval": 10,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 5
      }
    }
  ],
  "volumes": [
    {
      "name": "dapr-components",
      "host": {
        "sourcePath": "/opt/dapr/components"
      }
    }
  ]
}
```

## Dapr Components on ECS Anywhere Hosts

Create component files on each registered host:

```bash
# On each ECS Anywhere host
sudo mkdir -p /opt/dapr/components

# Create statestore component pointing to AWS ElastiCache Redis
cat > /opt/dapr/components/statestore.yaml <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "my-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379"
  - name: enableTLS
    value: "true"
EOF
```

## Service Discovery Across ECS Anywhere Tasks

Without Kubernetes, configure Dapr to use mDNS for service discovery on the same network:

```yaml
# config/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: default
spec:
  nameResolution:
    component: mdns
```

Or use Consul for service discovery if your infrastructure runs Consul agents:

```yaml
spec:
  nameResolution:
    component: consul
    configuration:
      selfRegister: true
```

## Registering the ECS Service

```bash
# Register a service in ECS
aws ecs register-task-definition \
  --cli-input-json file://order-service-task.json

# Create the service on the external cluster
aws ecs create-service \
  --cluster my-dapr-cluster \
  --service-name order-service \
  --task-definition order-service-dapr:1 \
  --desired-count 2 \
  --launch-type EXTERNAL
```

## Summary

Dapr on AWS ECS Anywhere runs in self-hosted mode with `daprd` as a sidecar container in ECS task definitions. Component configuration files are placed on each registered host, and the health check dependency ensures the app container waits for the Dapr sidecar to be ready. This pattern enables Dapr microservices on on-premises or edge hardware while using AWS ECS for centralized container orchestration.
