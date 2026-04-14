# How to Use Dapr with AWS Greengrass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS Greengrass, IoT, Edge Computing, AWS

Description: Integrate Dapr with AWS Greengrass v2 components to enable state management, pub/sub, and cloud synchronization for edge IoT workloads on AWS.

---

## Overview

AWS Greengrass v2 runs components (Docker containers or JVM processes) on edge devices. You can deploy Dapr as a Greengrass component alongside your application components to get Dapr's building blocks at the edge with AWS IoT Core and AWS services as backends.

## Greengrass Component Recipe for Dapr

```yaml
# dapr-sidecar-recipe.yaml
RecipeFormatVersion: "2020-01-25"
ComponentName: com.example.DaprSidecar
ComponentVersion: "1.0.0"
ComponentDescription: "Dapr sidecar for edge applications"
ComponentPublisher: "My Company"
ComponentDependencies:
  aws.greengrass.DockerApplicationManager:
    VersionRequirement: ">=2.0.0"

Manifests:
  - Platform:
      os: linux
    Lifecycle:
      Run:
        RequiresPrivilege: false
        Script: |
          docker run --rm --network host \
            --name daprd \
            -v /greengrass/v2/components/dapr/components:/components \
            daprio/daprd:1.13.0 \
            --app-id edge-app \
            --app-port 8080 \
            --dapr-http-port 3500 \
            --components-path /components \
            --log-level info
```

## Greengrass Recipe for Application Component

```yaml
RecipeFormatVersion: "2020-01-25"
ComponentName: com.example.SensorProcessor
ComponentVersion: "1.0.0"
ComponentDependencies:
  com.example.DaprSidecar:
    VersionRequirement: ">=1.0.0"
    DependencyType: HARD

Manifests:
  - Platform:
      os: linux
    Lifecycle:
      Run:
        Script: python3 {artifacts:path}/sensor_processor.py
    Artifacts:
      - Uri: s3://my-bucket/sensor_processor.py
```

## Dapr Component: AWS DynamoDB State Store

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "edge-device-state"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

## Dapr Component: AWS SNS/SQS Pub/Sub

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cloud-pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: messageVisibilityTimeout
    value: "30"
  - name: disableEntityManagement
    value: "false"
```

## Python Sensor Processor

```python
import requests
import time

DAPR_URL = "http://localhost:3500"

class SensorProcessor:
    def process_reading(self, device_id, reading):
        # Save to DynamoDB via Dapr
        self.save_reading(device_id, reading)

        # Sync to cloud via SNS/SQS
        if reading.get("anomaly"):
            self.publish_alert(device_id, reading)

    def save_reading(self, device_id, reading):
        requests.post(
            f"{DAPR_URL}/v1.0/state/statestore",
            json=[{
                "key": f"{device_id}-{int(time.time())}",
                "value": reading
            }]
        )

    def publish_alert(self, device_id, reading):
        try:
            requests.post(
                f"{DAPR_URL}/v1.0/publish/cloud-pubsub/device-alerts",
                json={
                    "deviceId": device_id,
                    "reading": reading,
                    "timestamp": time.time()
                },
                timeout=10
            )
        except requests.exceptions.RequestException as e:
            print(f"Cloud sync failed (will retry): {e}")

processor = SensorProcessor()

# Simulate sensor readings
while True:
    reading = {"temperature": 72.5, "humidity": 45.2, "anomaly": False}
    processor.process_reading("device-001", reading)
    time.sleep(5)
```

## Deploying Components to Greengrass Fleet

```bash
# Create deployment for a fleet of devices
aws greengrassv2 create-deployment \
  --target-arn "arn:aws:iot:us-east-1:123456789:thinggroup/production-sensors" \
  --components '{
    "com.example.DaprSidecar": {
      "componentVersion": "1.0.0"
    },
    "com.example.SensorProcessor": {
      "componentVersion": "1.0.0"
    }
  }'

# Monitor deployment status
aws greengrassv2 get-deployment \
  --deployment-id my-deployment-id
```

## Summary

AWS Greengrass v2 deploys Dapr as a component alongside your application components, providing state management via DynamoDB and cloud pub/sub via SNS/SQS. Define component dependencies to ensure Dapr starts before your application, use IAM roles with least-privilege access for AWS service authentication, and handle cloud connectivity failures gracefully with local state fallback. Deploy updates to device fleets via Greengrass deployments without manual device access.
