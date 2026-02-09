# How to Implement Firmware Update Workflows for IoT Devices Using Kubernetes Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IoT, Firmware Updates, Jobs, Edge Computing

Description: Learn how to orchestrate firmware updates for IoT devices using Kubernetes Jobs, including batch updates, rollback mechanisms, and status tracking for large-scale IoT deployments.

---

Managing firmware updates across fleets of IoT devices presents unique challenges around coordination, rollback, and failure handling. Kubernetes Jobs provide a powerful framework for orchestrating these updates, treating firmware deployment as batch workloads with built-in retry logic, parallelism controls, and completion tracking.

In this guide, we'll implement a complete firmware update workflow using Kubernetes Jobs that can safely update thousands of IoT devices, handle failures gracefully, and provide visibility into update progress across your device fleet.

## Understanding Kubernetes Jobs for IoT Updates

Kubernetes Jobs run pods to completion, making them ideal for firmware update operations that have a defined start and end. Unlike Deployments that maintain continuously running services, Jobs execute a task and terminate when complete.

For firmware updates, each Job represents an update operation targeting one or more devices. The Job specification defines how many devices to update in parallel, how to handle failures, and when to consider the update complete. This approach provides declarative firmware management where you specify the desired state and Kubernetes handles the execution.

Jobs integrate with ConfigMaps and Secrets to manage firmware images and device credentials, use persistent volumes for firmware file storage, and emit events that external systems can monitor to track update progress.

## Setting Up the Firmware Update Infrastructure

Create a namespace and supporting resources for firmware update operations:

```yaml
# firmware-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: firmware-updates
---
# Storage for firmware images
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: firmware-storage
  namespace: firmware-updates
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: nfs-client
```

Create a ConfigMap to track device inventory and update targets:

```yaml
# device-inventory.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: device-inventory
  namespace: firmware-updates
data:
  devices.json: |
    {
      "devices": [
        {
          "id": "device-001",
          "type": "sensor-v2",
          "current_version": "1.2.3",
          "target_version": "1.3.0",
          "endpoint": "mqtt://device-001.local"
        },
        {
          "id": "device-002",
          "type": "sensor-v2",
          "current_version": "1.2.3",
          "target_version": "1.3.0",
          "endpoint": "mqtt://device-002.local"
        }
      ]
    }
```

Store device credentials in a Secret:

```yaml
# device-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: device-credentials
  namespace: firmware-updates
type: Opaque
stringData:
  mqtt-username: firmware-updater
  mqtt-password: secure-password-here
  device-key: device-authentication-key
```

Apply these resources:

```bash
kubectl apply -f firmware-namespace.yaml
kubectl apply -f device-inventory.yaml
kubectl apply -f device-credentials.yaml
```

## Creating the Firmware Update Job

Design a Job that updates firmware on a batch of devices. The Job uses a container that connects to devices, uploads firmware, and verifies the update:

```yaml
# firmware-update-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: firmware-update-batch-1
  namespace: firmware-updates
  labels:
    firmware-version: "1.3.0"
    device-type: "sensor-v2"
spec:
  # Update 10 devices in parallel
  parallelism: 10
  # Total devices to update
  completions: 100
  # Keep failed pods for debugging
  backoffLimit: 3
  # Clean up completed pods after 1 hour
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app: firmware-updater
    spec:
      restartPolicy: OnFailure
      containers:
      - name: updater
        image: your-registry/firmware-updater:latest
        env:
        # Firmware version to deploy
        - name: TARGET_VERSION
          value: "1.3.0"
        # Device type filter
        - name: DEVICE_TYPE
          value: "sensor-v2"
        # Job index for device assignment
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        # MQTT credentials
        - name: MQTT_USERNAME
          valueFrom:
            secretKeyRef:
              name: device-credentials
              key: mqtt-username
        - name: MQTT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: device-credentials
              key: mqtt-password
        volumeMounts:
        # Mount firmware images
        - name: firmware
          mountPath: /firmware
          readOnly: true
        # Mount device inventory
        - name: inventory
          mountPath: /config
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
      volumes:
      - name: firmware
        persistentVolumeClaim:
          claimName: firmware-storage
      - name: inventory
        configMap:
          name: device-inventory
```

This Job configuration updates 100 devices with 10 parallel update operations. The `JOB_COMPLETION_INDEX` assigns each pod a unique device from the inventory.

## Implementing the Update Logic

Create the updater container that performs the actual firmware update. This example uses Python with the paho-mqtt library:

```python
# firmware_updater.py
import os
import json
import time
import paho.mqtt.client as mqtt
from pathlib import Path

class FirmwareUpdater:
    def __init__(self):
        self.target_version = os.getenv('TARGET_VERSION')
        self.device_type = os.getenv('DEVICE_TYPE')
        self.job_index = int(os.getenv('JOB_COMPLETION_INDEX', '0'))
        self.mqtt_username = os.getenv('MQTT_USERNAME')
        self.mqtt_password = os.getenv('MQTT_PASSWORD')

        # Load device inventory
        with open('/config/devices.json') as f:
            inventory = json.load(f)
            self.devices = inventory['devices']

    def get_assigned_device(self):
        """Get device assigned to this job index"""
        filtered = [d for d in self.devices
                   if d['type'] == self.device_type
                   and d['target_version'] == self.target_version]

        if self.job_index < len(filtered):
            return filtered[self.job_index]
        return None

    def load_firmware(self):
        """Load firmware image from storage"""
        firmware_path = f"/firmware/{self.device_type}-{self.target_version}.bin"

        if not Path(firmware_path).exists():
            raise FileNotFoundError(f"Firmware not found: {firmware_path}")

        with open(firmware_path, 'rb') as f:
            return f.read()

    def connect_device(self, device):
        """Connect to device via MQTT"""
        client = mqtt.Client()
        client.username_pw_set(self.mqtt_username, self.mqtt_password)

        # Parse endpoint
        endpoint = device['endpoint'].replace('mqtt://', '')
        host, port = endpoint.split(':') if ':' in endpoint else (endpoint, 1883)

        client.connect(host, int(port), 60)
        return client

    def upload_firmware(self, client, device, firmware_data):
        """Upload firmware to device in chunks"""
        chunk_size = 1024
        total_chunks = len(firmware_data) // chunk_size + 1

        # Send update command
        client.publish(f"device/{device['id']}/firmware/start",
                      json.dumps({
                          'version': self.target_version,
                          'size': len(firmware_data),
                          'chunks': total_chunks
                      }))

        # Upload chunks
        for i in range(0, len(firmware_data), chunk_size):
            chunk = firmware_data[i:i+chunk_size]
            chunk_num = i // chunk_size

            client.publish(f"device/{device['id']}/firmware/chunk/{chunk_num}",
                          chunk)

            print(f"Uploaded chunk {chunk_num + 1}/{total_chunks}")
            time.sleep(0.1)  # Rate limiting

        # Trigger firmware installation
        client.publish(f"device/{device['id']}/firmware/install", "")

    def verify_update(self, client, device):
        """Verify firmware was installed successfully"""
        version_received = False
        new_version = None

        def on_message(client, userdata, msg):
            nonlocal version_received, new_version
            new_version = msg.payload.decode()
            version_received = True

        client.on_message = on_message
        client.subscribe(f"device/{device['id']}/version")

        # Request version
        client.publish(f"device/{device['id']}/version/request", "")

        # Wait for response
        timeout = 60
        start = time.time()
        while not version_received and time.time() - start < timeout:
            client.loop(timeout=1)

        if new_version == self.target_version:
            print(f"✓ Update verified: {device['id']} now running {new_version}")
            return True
        else:
            print(f"✗ Update failed: {device['id']} running {new_version}, expected {self.target_version}")
            return False

    def run(self):
        """Execute firmware update"""
        device = self.get_assigned_device()

        if not device:
            print("No device assigned to this job index")
            return

        print(f"Updating device {device['id']} from {device['current_version']} to {self.target_version}")

        try:
            # Load firmware image
            firmware_data = self.load_firmware()
            print(f"Loaded firmware image: {len(firmware_data)} bytes")

            # Connect to device
            client = self.connect_device(device)
            print(f"Connected to device at {device['endpoint']}")

            # Upload firmware
            self.upload_firmware(client, device, firmware_data)
            print("Firmware uploaded successfully")

            # Wait for installation
            time.sleep(10)

            # Verify update
            if self.verify_update(client, device):
                print(f"✓ Device {device['id']} updated successfully")
                client.disconnect()
                exit(0)
            else:
                print(f"✗ Device {device['id']} update verification failed")
                client.disconnect()
                exit(1)

        except Exception as e:
            print(f"✗ Update failed: {str(e)}")
            exit(1)

if __name__ == '__main__':
    updater = FirmwareUpdater()
    updater.run()
```

Build and push the container:

```dockerfile
# Dockerfile
FROM python:3.11-slim

RUN pip install paho-mqtt==1.6.1

COPY firmware_updater.py /app/
WORKDIR /app

CMD ["python", "firmware_updater.py"]
```

Build and deploy:

```bash
docker build -t your-registry/firmware-updater:latest .
docker push your-registry/firmware-updater:latest
```

## Running Firmware Updates

Deploy the firmware update Job:

```bash
kubectl apply -f firmware-update-job.yaml

# Monitor update progress
kubectl get jobs -n firmware-updates -w

# View logs from update pods
kubectl logs -n firmware-updates -l app=firmware-updater --tail=50
```

Track completion status:

```bash
# Check how many devices updated successfully
kubectl get job firmware-update-batch-1 -n firmware-updates -o jsonpath='{.status.succeeded}'

# Check for failures
kubectl get job firmware-update-batch-1 -n firmware-updates -o jsonpath='{.status.failed}'
```

## Implementing Rollback Mechanisms

Create a rollback Job that reverts devices to their previous firmware version:

```yaml
# firmware-rollback-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: firmware-rollback-batch-1
  namespace: firmware-updates
spec:
  parallelism: 10
  completions: 100
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: updater
        image: your-registry/firmware-updater:latest
        env:
        # Rollback to previous version
        - name: TARGET_VERSION
          value: "1.2.3"
        - name: DEVICE_TYPE
          value: "sensor-v2"
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        envFrom:
        - secretRef:
            name: device-credentials
        volumeMounts:
        - name: firmware
          mountPath: /firmware
          readOnly: true
        - name: inventory
          mountPath: /config
      volumes:
      - name: firmware
        persistentVolumeClaim:
          claimName: firmware-storage
      - name: inventory
        configMap:
          name: device-inventory
```

## Creating Update Status Dashboard

Track firmware update status across your device fleet using a CronJob that aggregates results:

```yaml
# status-aggregator-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: firmware-status-aggregator
  namespace: firmware-updates
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: status-aggregator
          restartPolicy: OnFailure
          containers:
          - name: aggregator
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Count successful updates
              SUCCEEDED=$(kubectl get jobs -n firmware-updates \
                -l firmware-version=1.3.0 \
                -o jsonpath='{.items[*].status.succeeded}' | \
                awk '{for(i=1;i<=NF;i++)sum+=$i}END{print sum}')

              # Count failures
              FAILED=$(kubectl get jobs -n firmware-updates \
                -l firmware-version=1.3.0 \
                -o jsonpath='{.items[*].status.failed}' | \
                awk '{for(i=1;i<=NF;i++)sum+=$i}END{print sum}')

              # Store results in ConfigMap
              kubectl create configmap firmware-status \
                --from-literal=succeeded=$SUCCEEDED \
                --from-literal=failed=$FAILED \
                --from-literal=timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
                -n firmware-updates \
                --dry-run=client -o yaml | kubectl apply -f -

              echo "Update Status: $SUCCEEDED succeeded, $FAILED failed"
```

## Handling Partial Updates and Retries

For large device fleets, handle partial updates gracefully using Job indexing:

```yaml
# staged-update-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: firmware-update-stage-1
  namespace: firmware-updates
spec:
  # Stage 1: Update first 50 devices
  parallelism: 5
  completions: 50
  # Track completion index
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: updater
        image: your-registry/firmware-updater:latest
        env:
        - name: STAGE
          value: "1"
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
```

After validating stage 1, proceed to stage 2 with remaining devices.

## Conclusion

Kubernetes Jobs provide a robust framework for orchestrating firmware updates across IoT device fleets. The declarative nature of Jobs, combined with built-in retry logic and parallelism controls, makes it possible to safely update thousands of devices while maintaining visibility and control.

This approach treats firmware updates as batch workloads that Kubernetes schedules and manages, providing the same reliability and observability benefits that Kubernetes offers for application deployments. The Job-based model integrates naturally with existing Kubernetes infrastructure, making firmware management a first-class concern in your IoT platform.

For production deployments, implement comprehensive monitoring of update Jobs, create automated rollback procedures for failed updates, and establish staged rollout processes that validate updates on small device groups before deploying fleet-wide.
