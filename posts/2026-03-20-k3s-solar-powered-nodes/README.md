# How to Set Up K3s Cluster with Solar-Powered Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Edge Computing, IoT, Solar Power, Sustainability, Green Computing

Description: Learn how to deploy K3s on solar-powered edge nodes with power management strategies for reliable operation on renewable energy.

## Introduction

Solar-powered edge computing combines the benefits of edge AI/ML processing with renewable energy, enabling zero-operational-cost data centers in remote locations - weather stations, agricultural sensors, wildlife monitoring, or off-grid infrastructure. The challenge is that solar power is variable: you have abundant power during sunny days and limited or no power at night or during cloudy periods. K3s's lightweight footprint and workload management capabilities make it well-suited for this scenario.

## Hardware Considerations

### Typical Solar-Powered Node Setup

```text
Solar Panel (20-200W)
    ↓
Solar Charge Controller (MPPT)
    ↓
LiFePO4 Battery Bank (20-200Ah)
    ↓
12V/5V Power Supply
    ↓
Raspberry Pi 4 / NVIDIA Jetson Nano
    ↓
K3s Edge Node
```

### Power Consumption Reference

| Component | Power Consumption |
|-----------|------------------|
| Raspberry Pi 4 (idle) | ~2-3W |
| Raspberry Pi 4 (load) | ~5-8W |
| NVIDIA Jetson Nano (idle) | ~3-4W |
| NVIDIA Jetson Nano (load) | ~8-10W |
| 4G/LTE modem | ~2-5W |
| GPS module | ~0.5-1W |

## Step 1: Configure K3s for Power-Aware Operation

```yaml
# /etc/rancher/k3s/config.yaml

# Power-optimized K3s configuration

disable:
  - traefik
  - metrics-server

kubelet-arg:
  - "max-pods=20"
  - "system-reserved=cpu=200m,memory=256Mi"
  # More aggressive eviction to avoid memory or disk pressure on constrained nodes
  - "eviction-hard=memory.available<100Mi,nodefs.available<10%"
  - "cpu-manager-policy=static"

# Limit controller concurrency to reduce background CPU work
kube-controller-manager-arg:
  - "concurrent-service-syncs=1"
  - "concurrent-deployment-syncs=1"
```

## Step 2: Create Power State ConfigMap

Track and communicate power state to workloads and automation:

```yaml
# power-state-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: power-state
  namespace: default
data:
  state: "normal"           # normal, low-power, critical
  battery-percent: "85"
  solar-input-watts: "45"
  power-budget-watts: "15"
  last-updated: "2026-03-15T10:00:00Z"
```

## Step 3: Deploy Power Monitor DaemonSet

Monitor and report power state from the hardware:

```yaml
# power-monitor.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: power-monitor
  namespace: default
spec:
  selector:
    matchLabels:
      app: power-monitor
  template:
    metadata:
      labels:
        app: power-monitor
    spec:
      nodeSelector:
        node-type: solar
      containers:
        - name: power-monitor
          image: myregistry/power-monitor:v1
          imagePullPolicy: IfNotPresent
          ports:
            - name: metrics
              containerPort: 9100
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            # INA219 current/voltage sensor via I2C
            - name: POWER_SENSOR_BUS
              value: "1"
            - name: POWER_SENSOR_ADDRESS
              value: "0x40"
            # Battery state of charge via BMS
            - name: BMS_SERIAL_PORT
              value: "/dev/ttyUSB0"
            # Update interval
            - name: UPDATE_INTERVAL_SECONDS
              value: "30"
          securityContext:
            privileged: true
          volumeMounts:
            - name: i2c
              mountPath: /dev/i2c-1
            - name: serial
              mountPath: /dev/ttyUSB0
      volumes:
        - name: i2c
          hostPath:
            path: /dev/i2c-1
        - name: serial
          hostPath:
            path: /dev/ttyUSB0
```

## Step 4: Implement Power-Aware Workload Scheduling

Use PriorityClasses to express workload importance to the scheduler and your power-management automation:

```yaml
# priority-classes.yaml
---
# Critical: must run even on very low battery
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: solar-critical
value: 1000000
globalDefault: false
description: "Critical workloads that run even on minimum power"
---
# High: important workloads that should out-rank normal workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: solar-high
value: 100000
globalDefault: false
description: "Important workloads that should out-rank normal workloads"
---
# Normal: default priority for workloads that can be reduced first
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: solar-normal
value: 10000
globalDefault: true
description: "Default priority for workloads that can be reduced first"
---
# Background: lowest priority batch work when excess power is available
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: solar-background
value: -10
preemptionPolicy: Never
globalDefault: false
description: "Batch processing with the lowest scheduling priority"
```

## Step 5: Power-Adaptive Deployments

```yaml
# weather-station-critical.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-sensor-collector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: weather-sensor-collector
  template:
    metadata:
      labels:
        app: weather-sensor-collector
    spec:
      priorityClassName: solar-critical
      nodeSelector:
        node-type: solar
      containers:
        - name: sensor
          image: myregistry/weather-sensors:v1
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 50m    # Very low CPU - critical workload
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
          env:
            - name: POWER_STATE_FILE
              value: /etc/power-state/state
          volumeMounts:
            - name: power-state
              mountPath: /etc/power-state
              readOnly: true
      volumes:
        - name: power-state
          configMap:
            name: power-state
```

## Step 6: Power Management Controller

Deploy a controller that adjusts workloads based on battery state:

```bash
#!/bin/bash
# /usr/local/bin/power-manager.sh
# Run via CronJob or as a loop

BATTERY_THRESHOLD_LOW=30    # Percent
BATTERY_THRESHOLD_CRITICAL=15  # Percent

# Read battery state from the hardware (example: via UART BMS)
BATTERY_PERCENT=$(cat /sys/class/power_supply/battery/capacity 2>/dev/null || echo "50")

# Update the power-state ConfigMap
kubectl -n default patch configmap power-state \
  --type merge \
  -p "{\"data\":{
    \"battery-percent\": \"$BATTERY_PERCENT\",
    \"last-updated\": \"$(date -Iseconds)\"
  }}"

# Scale down non-critical workloads based on battery level
if [ "$BATTERY_PERCENT" -lt "$BATTERY_THRESHOLD_CRITICAL" ]; then
  # Critical: only keep essential sensors running
  echo "CRITICAL power state: scaling down non-critical workloads"
  kubectl scale deployment weather-display --replicas=0 -n default
  kubectl scale deployment data-aggregator --replicas=0 -n default
  kubectl -n default patch configmap power-state --type merge \
    -p '{"data":{"state":"critical"}}'

elif [ "$BATTERY_PERCENT" -lt "$BATTERY_THRESHOLD_LOW" ]; then
  # Low power: reduce replication, suspend background jobs
  echo "LOW power state: reducing workloads"
  kubectl scale deployment weather-display --replicas=1 -n default
  kubectl scale deployment ml-inference --replicas=0 -n default
  kubectl -n default patch configmap power-state --type merge \
    -p '{"data":{"state":"low-power"}}'

else
  # Normal operation
  echo "NORMAL power state: full operation"
  kubectl scale deployment weather-display --replicas=1 -n default
  kubectl scale deployment data-aggregator --replicas=1 -n default
  kubectl scale deployment ml-inference --replicas=1 -n default
  kubectl -n default patch configmap power-state --type merge \
    -p '{"data":{"state":"normal"}}'
fi
```

## Step 7: Configure Night-Hour Low-Power Scheduling

```bash
# /usr/local/bin/solar-schedule.sh
# Scale non-essential workloads down at night

SUNRISE_HOUR=6    # 6 AM
SUNSET_HOUR=20    # 8 PM
CURRENT_HOUR=$(date +%H)

if [ "$CURRENT_HOUR" -lt "$SUNRISE_HOUR" ] || [ "$CURRENT_HOUR" -ge "$SUNSET_HOUR" ]; then
  # Night time: minimal operation
  echo "Night mode: suspending non-essential workloads"
  kubectl scale deployment background-tasks --replicas=0 -n default
  kubectl scale deployment ml-training --replicas=0 -n default
else
  # Daytime: full operation with solar power
  echo "Day mode: full operation"
  kubectl scale deployment background-tasks --replicas=1 -n default
fi
```

## Step 8: Monitor Energy Efficiency

```bash
# If you're using Prometheus Operator, create a PodMonitor for the power telemetry endpoint
kubectl apply -f - <<'EOF'
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: power-monitor
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app: power-monitor
  podMetricsEndpoints:
    - port: metrics
      interval: 60s  # Less frequent scraping to save power
EOF
```

## Conclusion

K3s on solar-powered nodes requires thoughtful power management at multiple levels: hardware selection for low consumption, K3s configuration to minimize idle overhead, priority-based workload scheduling to protect critical functions, and automated scaling based on battery state. The lightweight nature of K3s makes it uniquely suitable for solar-powered deployments where minimizing power consumption while maximizing computational capability is essential. With proper configuration, a single 200W solar panel and 100Ah battery bank can be enough for some low-power K3s edge deployments, but required solar and battery capacity depends heavily on geography, season, autonomy targets, and total system load.
