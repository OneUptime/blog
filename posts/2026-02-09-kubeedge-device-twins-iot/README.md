# How to Configure KubeEdge Device Twins for IoT Sensor Data Synchronization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeEdge, IoT

Description: Learn how to configure KubeEdge device twins to maintain synchronized state between IoT sensors and the cloud, enabling bidirectional updates and offline-capable edge applications.

---

IoT applications require continuous synchronization between physical devices and cloud applications. A temperature sensor needs to report readings to the cloud, while cloud systems need to update sensor configuration. KubeEdge's device twin model provides this bidirectional synchronization with offline resilience.

In this guide, you'll configure device twins for IoT sensors, implement state synchronization patterns, and build applications that react to device state changes in real time.

## Understanding Device Twins

A device twin is a digital representation of a physical device that maintains:

- **Desired state**: What the cloud wants the device to be
- **Reported state**: What the device actually is
- **Metadata**: Timestamps and mapper-observed desired state

When online, twins sync automatically. When offline, edge nodes cache desired state and sync when connectivity returns. This allows applications to work despite network issues.

## Installing KubeEdge Device CRDs

If not already installed:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_device.yaml
kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_devicemodel.yaml
kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_devicestatus.yaml
```

## Defining a Comprehensive Device Model

Create a model for environmental sensors:

```yaml
# environmental-sensor-model.yaml

apiVersion: devices.kubeedge.io/v1beta1
kind: DeviceModel
metadata:
  name: environmental-sensor
  namespace: default
spec:
  protocol: mqtt
  properties:
    - name: temperature
      description: Temperature in celsius
      type: FLOAT
      accessMode: ReadOnly
      unit: celsius
      minimum: "-40"
      maximum: "85"
    - name: humidity
      description: Humidity percentage
      type: INT
      accessMode: ReadOnly
      unit: percent
      minimum: "0"
      maximum: "100"
    - name: pressure
      description: Atmospheric pressure
      type: INT
      accessMode: ReadOnly
      unit: kPa
    - name: sampling-interval
      description: Seconds between readings
      type: INT
      accessMode: ReadWrite
      minimum: "10"
      maximum: "3600"
    - name: alert-threshold-temp
      description: Temperature alert threshold
      type: FLOAT
      accessMode: ReadWrite
    - name: enabled
      description: Enable/disable sensor
      type: BOOLEAN
      accessMode: ReadWrite
```

Apply the model:

```bash
kubectl apply -f environmental-sensor-model.yaml
```

## Creating Device Instances with Twins

Define actual sensor devices:

```yaml
# sensor-device-01.yaml
apiVersion: devices.kubeedge.io/v1beta1
kind: Device
metadata:
  name: env-sensor-warehouse-01
  namespace: default
  labels:
    location: warehouse
    zone: storage-area-1
spec:
  deviceModelRef:
    name: environmental-sensor
  nodeName: edge-node-warehouse
  protocol:
    protocolName: mqtt
    configData:
      brokerURL: tcp://mqtt-broker.local:1883
      clientID: env-sensor-01
      username: sensor-user
      password: sensor-pass
  properties:
    - name: temperature
      collectCycle: 10000000000
      reportCycle: 10000000000
      reportToCloud: true
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/temperature
          dataType: FLOAT
    - name: humidity
      collectCycle: 10000000000
      reportCycle: 10000000000
      reportToCloud: true
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/humidity
          dataType: INT
    - name: pressure
      collectCycle: 10000000000
      reportCycle: 10000000000
      reportToCloud: true
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/pressure
          dataType: INT
    - name: sampling-interval
      desired:
        value: "60"
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/config/interval
          dataType: INT
          retained: true
    - name: alert-threshold-temp
      desired:
        value: "30.0"
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/config/threshold
          dataType: FLOAT
          retained: true
    - name: enabled
      desired:
        value: "true"
      visitors:
        protocolName: mqtt
        configData:
          topic: sensors/env-sensor-01/config/enabled
          dataType: BOOLEAN
          retained: true
```

Apply the device:

```bash
kubectl apply -f sensor-device-01.yaml
```

## Deploying MQTT Device Mapper

The mapper translates between MQTT and device twins. Generate a mapper with the KubeEdge Mapper Framework and build it as a container image:

```yaml
# mqtt-mapper.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mqtt-mapper
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mqtt-mapper
  template:
    metadata:
      labels:
        app: mqtt-mapper
    spec:
      nodeName: edge-node-warehouse
      hostNetwork: true
      containers:
        - name: mapper
          image: your-registry/mqtt-mapper:1.0.0
          env:
            - name: MQTT_BROKER_URL
              value: "tcp://mqtt-broker.local:1883"
            - name: LOG_LEVEL
              value: "debug"
          volumeMounts:
            - name: mapper-config
              mountPath: /etc/kubeedge/config
      volumes:
        - name: mapper-config
          configMap:
            name: mqtt-mapper-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mqtt-mapper-config
data:
  config.yaml: |
    mqtt:
      broker: tcp://mqtt-broker.local:1883
      session-queue-size: 100
```

Apply the mapper:

```bash
kubectl apply -f mqtt-mapper.yaml
```

## Reading Device Twin State

Query device state from the cloud:

```bash
# Get full device and status details
kubectl get device env-sensor-warehouse-01 -o yaml
kubectl get devicestatus env-sensor-warehouse-01 -o yaml

# Extract twin data
kubectl get devicestatus env-sensor-warehouse-01 \
  -o jsonpath='{.status.twins}' | jq
```

You'll see output like:

```json
[
  {
    "propertyName": "temperature",
    "reported": {
      "value": "22.5",
      "metadata": {
        "timestamp": "1707494800000",
        "type": "float"
      }
    }
  },
  {
    "propertyName": "sampling-interval",
    "observedDesired": {
      "value": "60",
      "metadata": {"type": "int"}
    },
    "reported": {
      "value": "60",
      "metadata": {"timestamp": "1707494800000"}
    }
  }
]
```

## Updating Device Configuration from Cloud

Change device settings from the cloud:

```bash
# Update the desired values. These JSON Patch paths match the property order
# in the device manifest above.
kubectl patch device env-sensor-warehouse-01 --type json -p='[
  {"op":"replace","path":"/spec/properties/3/desired/value","value":"30"},
  {"op":"replace","path":"/spec/properties/4/desired/value","value":"28.0"}
]'
```

KubeEdge propagates this to the edge node, the mapper writes it to MQTT, and the physical sensor receives the update.

## Building a Device State Monitor Application

Create an application that watches device twins:

```yaml
# device-monitor-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: device-state-monitor
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: device-monitor
  template:
    metadata:
      labels:
        app: device-monitor
    spec:
      serviceAccountName: device-monitor
      containers:
        - name: monitor
          image: python:3.11-slim
          command:
            - bash
            - -c
            - |
              pip install kubernetes requests
              python3 << 'PYTHON'
              from kubernetes import client, config, watch
              import time
              import json

              config.load_incluster_config()
              api = client.CustomObjectsApi()

              print("Monitoring device twins...")

              w = watch.Watch()
              for event in w.stream(
                api.list_namespaced_custom_object,
                group="devices.kubeedge.io",
                version="v1beta1",
                namespace="default",
                plural="devicestatuses"
              ):
                event_type = event['type']
                status = event['object']
                device_name = status['metadata']['name']

                try:
                  device = api.get_namespaced_custom_object(
                    group="devices.kubeedge.io",
                    version="v1beta1",
                    namespace="default",
                    plural="devices",
                    name=device_name
                  )
                  if device.get('metadata', {}).get('labels', {}).get('location') != 'warehouse':
                    continue
                except Exception:
                  continue

                print(f"Event: {event_type} - Device: {device_name}")

                if 'status' in status and 'twins' in status['status']:
                  for twin in status['status']['twins']:
                    prop_name = twin['propertyName']
                    reported = twin.get('reported', {})
                    value = reported.get('value', 'N/A')

                    if prop_name == 'temperature':
                      temp = float(value) if value != 'N/A' else 0
                      if temp > 30:
                        print(f"ALERT: High temperature {temp}C on {device_name}")
              PYTHON
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: device-monitor
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: device-reader
rules:
  - apiGroups: ["devices.kubeedge.io"]
    resources: ["devices", "devicestatuses"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: device-monitor-binding
subjects:
  - kind: ServiceAccount
    name: device-monitor
    namespace: default
roleRef:
  kind: ClusterRole
  name: device-reader
  apiGroup: rbac.authorization.k8s.io
```

Apply the monitor:

```bash
kubectl apply -f device-monitor-app.yaml

# Watch logs
kubectl logs -f deployment/device-state-monitor
```

## Implementing Batch Configuration Updates

Update multiple devices simultaneously:

```bash
# Update all warehouse sensors
kubectl get devices -l location=warehouse -o name | while read device; do
  kubectl patch "$device" --type json -p='[
    {"op":"replace","path":"/spec/properties/3/desired/value","value":"120"}
  ]'
done
```

## Creating Alert Rules Based on Device State

Implement automated alerting:

```yaml
# device-alert-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alert-controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alert-controller
  template:
    metadata:
      labels:
        app: alert-controller
    spec:
      serviceAccountName: device-monitor
      containers:
        - name: controller
          image: python:3.11-slim
          command:
            - bash
            - -c
            - |
              pip install kubernetes requests
              python3 << 'PYTHON'
              from kubernetes import client, config
              import time

              config.load_incluster_config()
              api = client.CustomObjectsApi()

              def check_alerts():
                statuses = api.list_namespaced_custom_object(
                  group="devices.kubeedge.io",
                  version="v1beta1",
                  namespace="default",
                  plural="devicestatuses"
                )

                for status in statuses['items']:
                  name = status['metadata']['name']
                  twins = status.get('status', {}).get('twins', [])

                  temp_value = None
                  threshold = 30.0

                  for twin in twins:
                    if twin['propertyName'] == 'temperature':
                      temp_value = float(twin.get('reported', {}).get('value', 0))
                    elif twin['propertyName'] == 'alert-threshold-temp':
                      threshold_str = twin.get('observedDesired', {}).get('value') or \
                                     twin.get('reported', {}).get('value')
                      if threshold_str:
                        threshold = float(threshold_str)

                  if temp_value and temp_value > threshold:
                    print(f"CRITICAL: {name} temperature {temp_value}C exceeds threshold {threshold}C")
                    # Send alert to monitoring system
                    # requests.post('http://alertmanager/api/v1/alerts', ...)

              while True:
                check_alerts()
                time.sleep(30)
              PYTHON
```

## Synchronizing Device State to Time-Series Database

Store device readings for historical analysis:

```yaml
# timeseries-sync.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: device-timeseries-sync
spec:
  replicas: 1
  selector:
    matchLabels:
      app: timeseries-sync
  template:
    metadata:
      labels:
        app: timeseries-sync
    spec:
      serviceAccountName: device-monitor
      containers:
        - name: sync
          image: python:3.11-slim
          env:
            - name: INFLUXDB_URL
              value: "http://influxdb.default.svc:8086"
            - name: INFLUXDB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: influxdb-credentials
                  key: token
          command:
            - bash
            - -c
            - |
              pip install kubernetes influxdb-client
              python3 << 'PYTHON'
              from kubernetes import client, config, watch
              from influxdb_client import InfluxDBClient, Point
              from influxdb_client.client.write_api import SYNCHRONOUS
              import os
              import time

              config.load_incluster_config()
              k8s_api = client.CustomObjectsApi()

              influx_client = InfluxDBClient(
                url=os.environ['INFLUXDB_URL'],
                token=os.environ['INFLUXDB_TOKEN'],
                org="edge-org"
              )
              write_api = influx_client.write_api(write_options=SYNCHRONOUS)

              w = watch.Watch()
              for event in w.stream(
                k8s_api.list_namespaced_custom_object,
                group="devices.kubeedge.io",
                version="v1beta1",
                namespace="default",
                plural="devicestatuses"
              ):
                status = event['object']
                device_name = status['metadata']['name']

                try:
                  device = k8s_api.get_namespaced_custom_object(
                    group="devices.kubeedge.io",
                    version="v1beta1",
                    namespace="default",
                    plural="devices",
                    name=device_name
                  )
                  location = device['metadata'].get('labels', {}).get('location', 'unknown')
                except Exception:
                  location = 'unknown'

                twins = status.get('status', {}).get('twins', [])

                for twin in twins:
                  prop_name = twin['propertyName']
                  reported = twin.get('reported', {})
                  value = reported.get('value')
                  timestamp = reported.get('metadata', {}).get('timestamp')

                  if value and prop_name in ['temperature', 'humidity', 'pressure']:
                    point = Point("sensor_reading") \
                      .tag("device", device_name) \
                      .tag("location", location) \
                      .tag("property", prop_name) \
                      .field("value", float(value)) \
                      .time(int(timestamp) * 1000000 if timestamp else None)

                    write_api.write(bucket="sensors", record=point)
                    print(f"Wrote {prop_name}={value} for {device_name}")
              PYTHON
```

## Handling Offline Edge Scenarios

Device twins continue working when edge nodes lose cloud connectivity:

1. **Edge nodes cache desired state** from last sync
2. **Mappers continue updating reported state** locally
3. **Applications on edge nodes** see latest twin state
4. **When connectivity returns**, twins automatically sync

Test offline behavior:

```bash
# On edge node, simulate network partition
sudo iptables -A OUTPUT -d <cloud-api-ip> -j DROP

# Device twins still update locally for mappers and edge applications

# Restore connectivity
sudo iptables -D OUTPUT -d <cloud-api-ip> -j DROP

# Watch synchronization occur
kubectl get devicestatus env-sensor-warehouse-01 -o yaml -w
```

## Implementing Device Twin Versioning

Track configuration changes over time:

```yaml
# Add version annotation
apiVersion: devices.kubeedge.io/v1beta1
kind: Device
metadata:
  name: env-sensor-warehouse-01
  annotations:
    config-version: "v2"
    last-updated: "2026-02-09T10:00:00Z"
    updated-by: "automation-system"
```

## Monitoring Device Twin Health

Create monitoring dashboard rules if your mapper or monitor exports these custom metrics:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: device-twin-alerts
spec:
  groups:
    - name: device-twins
      rules:
        - alert: DeviceTwinStale
          expr: |
            time() - kubeedge_device_twin_last_update_timestamp > 600
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Device twin not updated in 10 minutes"

        - alert: DeviceTwinDesiredReportedMismatch
          expr: |
            kubeedge_device_twin_desired_value != kubeedge_device_twin_reported_value
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Device twin desired and reported states mismatched for 15+ minutes"
```

## Conclusion

KubeEdge device twins provide a robust foundation for IoT state synchronization, combining cloud-scale management with edge resilience. By modeling devices as Kubernetes resources with bidirectional sync, you create systems that work reliably despite network variability.

Start with a handful of devices to validate your twin model and synchronization patterns, then scale to thousands of devices across distributed edge locations. The combination of declarative configuration and automatic synchronization makes large-scale IoT fleet management practical and maintainable.
