# How to Manage IoT Device Configuration with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, IoT, GitOps, Edge Computing, Device Management, ConfigMap

Description: Use Flux CD to manage IoT device configuration at scale, providing GitOps-driven configuration versioning and rollback for thousands of devices.

---

## Introduction

Managing configuration for thousands of IoT devices is one of the most operationally challenging problems in edge computing. Device-specific settings, firmware parameters, sensor calibrations, and communication protocols need to be versioned, audited, and deployed reliably. A manual or ad-hoc approach breaks down quickly as device counts grow.

Flux CD provides a principled solution: store all device configuration in Git, manage it through Kubernetes ConfigMaps and Custom Resources, and let Flux's reconciliation loop push configuration changes to devices through their edge Kubernetes clusters. Changes are auditable through Git history, rollbacks are a single commit revert, and configuration drift is automatically corrected.

This guide covers modeling IoT device configuration as Kubernetes resources, managing it with Flux, and scaling the pattern to large device fleets.

## Prerequisites

- IoT devices running Kubernetes (K3s or KubeEdge)
- Flux CD deployed on edge clusters or central management cluster
- Git repository for device configuration
- Device configuration readable/writable by containerized agents

## Step 1: Model Device Configuration as ConfigMaps

Store device-specific configuration in ConfigMaps, managed by Flux through Kustomize overlays.

```yaml
# apps/base/iot-device/configmap.yaml
# Base configuration template
apiVersion: v1
kind: ConfigMap
metadata:
  name: device-config
  namespace: iot-devices
data:
  # Sensor configuration
  sensor-poll-interval-seconds: "30"
  sensor-type: "temperature-humidity"
  # Communication settings
  mqtt-broker: "mqtt.example.com"
  mqtt-port: "1883"
  mqtt-topic-prefix: "sensors"
  # Calibration (overridden per device)
  temperature-offset: "0.0"
  humidity-offset: "0.0"
  # Operational parameters
  data-retention-hours: "24"
  alert-threshold-temp-celsius: "85.0"
```

```yaml
# apps/overlays/device-site-001/configmap-patch.yaml
# Site-specific calibration values
apiVersion: v1
kind: ConfigMap
metadata:
  name: device-config
  namespace: iot-devices
data:
  # Site-specific calibration based on physical measurement
  temperature-offset: "-1.5"
  humidity-offset: "2.0"
  # Site-specific MQTT topic
  mqtt-topic-prefix: "sensors/site-001"
  # Site runs hotter - lower threshold
  alert-threshold-temp-celsius: "75.0"
```

## Step 2: Version Configuration Changes Through Git

Every configuration change goes through Git, providing full audit history.

```bash
# Update device calibration for site-001
vim apps/overlays/device-site-001/configmap-patch.yaml
# Change temperature-offset from -1.5 to -2.0

git add apps/overlays/device-site-001/configmap-patch.yaml
git commit -m "calibrate: adjust temp offset for site-001 after physical measurement"
git push origin main

# Flux will apply the change within the next reconciliation interval
# The device agent reads the ConfigMap and applies the new calibration
```

## Step 3: Deploy a Device Configuration Agent

A lightweight agent running as a DaemonSet reads the ConfigMap and applies settings to the device.

```yaml
# apps/base/iot-device/config-agent.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: device-config-agent
  namespace: iot-devices
spec:
  selector:
    matchLabels:
      app: device-config-agent
  template:
    metadata:
      labels:
        app: device-config-agent
    spec:
      nodeSelector:
        node-role.kubernetes.io/edge: ""
      tolerations:
        - key: node-role.kubernetes.io/edge
          operator: Exists
          effect: NoSchedule
      containers:
        - name: agent
          image: my-registry.example.com/device-config-agent:v1.0.0
          imagePullPolicy: IfNotPresent
          env:
            - name: CONFIG_NAMESPACE
              value: iot-devices
            - name: CONFIG_MAP_NAME
              value: device-config
          volumeMounts:
            - name: device-config
              mountPath: /etc/device-config
            - name: host-config
              mountPath: /host/etc/sensor
          # Read ConfigMap from mounted volume
          # Watches for changes and applies them to hardware
      volumes:
        - name: device-config
          configMap:
            name: device-config
        - name: host-config
          hostPath:
            path: /etc/sensor
```

## Step 4: Use Kustomize Substitution for Device-Specific Values

```yaml
# clusters/edge-site-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: iot-devices
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/device-site-001
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Inject cluster-specific values at reconcile time
  postBuild:
    substitute:
      DEVICE_SITE_ID: "site-001"
      DEVICE_REGION: "us-east"
      DEVICE_OWNER: "ops-team-alpha"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
        optional: false
```

```yaml
# apps/base/iot-device/device-labels.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: device-metadata
  namespace: iot-devices
  labels:
    site: "${DEVICE_SITE_ID}"
    region: "${DEVICE_REGION}"
    owner: "${DEVICE_OWNER}"
data:
  site-id: "${DEVICE_SITE_ID}"
  region: "${DEVICE_REGION}"
  owner: "${DEVICE_OWNER}"
```

## Step 5: Implement Configuration Validation

Validate device configuration before Flux applies it to prevent misconfigurations.

```yaml
# clusters/edge-site-001/apps.yaml - with validation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: iot-devices
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/device-site-001
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Validate manifests against schema before applying
  validation: server
  # Health check - verify config agent picked up the change
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: device-config-agent
      namespace: iot-devices
```

Add a CI validation step to your Git repository:

```yaml
# .github/workflows/validate-device-config.yml
name: Validate Device Configuration

on:
  pull_request:
    paths: ['apps/overlays/**/configmap-patch.yaml']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate temperature offset range
        run: |
          for file in apps/overlays/*/configmap-patch.yaml; do
            OFFSET=$(grep temperature-offset "$file" | grep -oP '[\-0-9.]+')
            if (( $(echo "$OFFSET > 5.0 || $OFFSET < -5.0" | bc -l) )); then
              echo "ERROR: $file has unreasonable temperature-offset: $OFFSET"
              exit 1
            fi
          done
          echo "All temperature offsets within acceptable range"
```

## Step 6: Roll Back a Bad Configuration

```bash
# A bad calibration value was pushed; roll it back
git log --oneline apps/overlays/device-site-001/configmap-patch.yaml
# abc1234 calibrate: adjust temp offset for site-001 (bad value)
# def5678 calibrate: initial site-001 calibration (good)

# Revert the bad commit
git revert abc1234 --no-edit
git push origin main

# Flux will apply the reverted ConfigMap within the next reconciliation
# Device agent will pick up the corrected configuration automatically
```

## Best Practices

- Store every device configuration parameter in Git, not embedded in device firmware or local files.
- Use site-specific Kustomize overlays for device calibration; share base configuration across all devices.
- Implement CI validation to catch out-of-range configuration values before they reach devices.
- Use Flux's health checks to confirm configuration agents are running after each reconciliation.
- Version-control configuration changes with meaningful commit messages for audit purposes.
- Test configuration changes on one site before rolling out to the full fleet.

## Conclusion

Flux CD transforms IoT device configuration management from a manual, error-prone process into a GitOps-driven workflow with full audit history, automated rollout, and reliable rollback. By modeling device settings as Kubernetes ConfigMaps and using Kustomize overlays for device-specific values, you can manage configuration for thousands of devices from a single Git repository with confidence.
