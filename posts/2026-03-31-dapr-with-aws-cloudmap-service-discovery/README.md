# How to Use Dapr with AWS CloudMap for Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, CloudMap, Service Discovery, ECS

Description: Configure Dapr to use AWS CloudMap for service discovery on ECS and non-Kubernetes environments, enabling Dapr service invocation with dynamic service registration.

---

AWS CloudMap is a service discovery service that registers and tracks the health and location of services. When deploying Dapr on AWS ECS or EC2 instead of Kubernetes, CloudMap provides the name resolution layer that Dapr's service invocation needs.

## Create a CloudMap Namespace and Service

```bash
# Create a private DNS namespace for your application
aws servicediscovery create-private-dns-namespace \
  --name dapr.local \
  --vpc vpc-0123456789abcdef0 \
  --region us-east-1

# Get the namespace ID
NAMESPACE_ID=$(aws servicediscovery list-namespaces \
  --query "Namespaces[?Name=='dapr.local'].Id" \
  --output text)

# Create a service discovery service for order-service
aws servicediscovery create-service \
  --name order-service \
  --namespace-id "$NAMESPACE_ID" \
  --dns-config "NamespaceId=${NAMESPACE_ID},DnsRecords=[{Type=A,TTL=10}]" \
  --health-check-custom-config "FailureThreshold=1" \
  --region us-east-1
```

## Register a Service Instance

```bash
# Register an ECS task instance with CloudMap
aws servicediscovery register-instance \
  --service-id srv-0abc123def456 \
  --instance-id "ecs-task-001" \
  --attributes '{
    "AWS_INSTANCE_IPV4": "10.0.1.50",
    "AWS_INSTANCE_PORT": "8080",
    "DAPR_PORT": "3500"
  }' \
  --region us-east-1
```

## Configure ECS Task with Dapr Sidecar

```json
{
  "family": "order-service",
  "containerDefinitions": [
    {
      "name": "order-service",
      "image": "myrepo/order-service:latest",
      "portMappings": [{"containerPort": 8080}],
      "environment": [
        {"name": "APP_PORT", "value": "8080"}
      ]
    },
    {
      "name": "dapr-sidecar",
      "image": "daprio/daprd:latest",
      "command": [
        "./daprd",
        "--app-id", "order-service",
        "--app-port", "8080",
        "--dapr-http-port", "3500",
        "--dapr-grpc-port", "50001",
        "--components-path", "/components"
      ],
      "portMappings": [
        {"containerPort": 3500},
        {"containerPort": 50001}
      ]
    }
  ],
  "serviceRegistries": [
    {
      "registryArn": "arn:aws:servicediscovery:us-east-1:123456789012:service/srv-0abc123def456",
      "containerName": "order-service",
      "containerPort": 8080
    }
  ]
}
```

## Configure Dapr Name Resolution for CloudMap

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
spec:
  nameResolution:
    component: "aws.cloudmap"
    version: "v1"
    configuration:
      region: us-east-1
      namespaceName: "dapr.local"
```

## Invoke a Service via Dapr with CloudMap

Once CloudMap is configured, service invocation works the same as on Kubernetes:

```python
import requests

def invoke_order_service(path: str, body: dict = None):
    url = f"http://localhost:3500/v1.0/invoke/order-service/method{path}"

    if body:
        resp = requests.post(url, json=body)
    else:
        resp = requests.get(url)

    resp.raise_for_status()
    return resp.json()

# Call order details on another ECS service
result = invoke_order_service("/orders/order-001")
print(result)
```

## Health Check Integration

```bash
# CloudMap uses custom health checks; mark unhealthy instances
aws servicediscovery update-instance-custom-health-status \
  --service-id srv-0abc123def456 \
  --instance-id "ecs-task-001" \
  --status UNHEALTHY \
  --region us-east-1

# CloudMap stops routing traffic to unhealthy instances
# Dapr service invocation will not route to them
```

## Summary

AWS CloudMap provides the service registry that Dapr needs for name-based service invocation outside of Kubernetes. By integrating CloudMap with ECS service registries, Dapr automatically discovers healthy instances of target services and routes invocation requests without hardcoded IPs. This makes Dapr service invocation portable across both Kubernetes and ECS environments.
