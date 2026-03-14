# How to Deploy Flux CD on KubeEdge

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, KubeEdge, Kubernetes, Edge Computing, GitOps, IoT, Edge-Cloud

Description: Set up Flux CD with KubeEdge for edge-cloud collaboration, managing workloads across both cloud and edge nodes from a single GitOps repository.

---

## Introduction

KubeEdge extends Kubernetes to edge environments by running a lightweight edge agent (EdgeCore) on edge devices that communicates with a cloud-side component (CloudCore). This architecture enables Kubernetes-native management of edge devices even with unreliable connectivity — EdgeCore caches workload state locally so pods keep running even when the connection to the cloud is severed.

Integrating Flux CD with KubeEdge creates a powerful GitOps-driven edge computing platform. Flux runs in the cloud-side Kubernetes cluster and reconciles workload definitions that KubeEdge then distributes to edge nodes. This gives you Git as the single source of truth for both cloud and edge workloads.

This guide covers deploying Flux on a KubeEdge cloud cluster, configuring edge-specific Kustomizations, and managing the edge-cloud separation of concerns through GitOps.

## Prerequisites

- A Kubernetes cluster for the cloud side (AKS, EKS, GKE, or bare metal)
- KubeEdge installed: CloudCore on the cloud cluster, EdgeCore on edge devices
- Flux CD bootstrapped on the cloud cluster
- Edge devices with EdgeCore registered and showing as nodes
- `kubectl` able to see both cloud and edge nodes

## Step 1: Verify KubeEdge Architecture

```bash
# Verify edge nodes appear as Kubernetes nodes
kubectl get nodes
# Expected output includes edge nodes with type="edge" label:
# NAME              STATUS   ROLES        AGE
# cloud-node-1      Ready    control-plane
# cloud-worker-1    Ready    worker
# edge-device-001   Ready    agent        # KubeEdge edge node
# edge-device-002   Ready    agent

# Check edge node details
kubectl describe node edge-device-001 | grep -A5 Labels
# Labels: node-role.kubernetes.io/edge=""
#         kubernetes.io/hostname=edge-device-001
```

## Step 2: Repository Structure for Edge-Cloud Separation

```
clusters/
  cloud/
    flux-system/
    cloud-apps.yaml
    edge-workloads.yaml    # Manages workloads targeting edge nodes
infrastructure/
  kubeedge/
    cloud-core-config.yaml
    device-models/
apps/
  cloud/                   # Cloud-only workloads
    api-server/
    database/
  edge/                    # Edge-targeted workloads
    data-collector/
    local-inference/
  overlays/
    edge-device-001/       # Device-specific config
    edge-device-002/
```

## Step 3: Configure Edge-Targeted Kustomizations

```yaml
# clusters/cloud/edge-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: edge-workloads
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/edge
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Validate edge workloads before applying
  validation: client
  postBuild:
    substitute:
      EDGE_NAMESPACE: "edge-workloads"
```

```yaml
# apps/edge/data-collector/deployment.yaml
# Deployment targeting KubeEdge edge nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-collector
  namespace: edge-workloads
spec:
  replicas: 1
  selector:
    matchLabels:
      app: data-collector
  template:
    metadata:
      labels:
        app: data-collector
    spec:
      # Target KubeEdge edge nodes specifically
      nodeSelector:
        node-role.kubernetes.io/edge: ""
      # Tolerate edge node taints
      tolerations:
        - key: node-role.kubernetes.io/edge
          operator: Exists
          effect: NoSchedule
      # Use hostNetwork for edge device sensor access
      hostNetwork: true
      containers:
        - name: collector
          image: my-registry.example.com/data-collector:v1.2.3
          imagePullPolicy: IfNotPresent
          env:
            - name: SENSOR_INTERFACE
              value: /dev/ttyUSB0
          volumeMounts:
            - name: device
              mountPath: /dev/ttyUSB0
      volumes:
        - name: device
          hostPath:
            path: /dev/ttyUSB0
            type: CharDevice
```

## Step 4: Manage KubeEdge Device Models with Flux

KubeEdge uses DeviceModel and DeviceInstance CRDs to manage IoT devices. Manage these through Flux.

```yaml
# apps/edge/devices/temperature-sensor-model.yaml
apiVersion: devices.kubeedge.io/v1beta1
kind: DeviceModel
metadata:
  name: temperature-sensor
  namespace: edge-workloads
spec:
  properties:
    - name: temperature
      description: "Current temperature reading in Celsius"
      type:
        double:
          accessMode: ReadOnly
          defaultValue: 0.0
    - name: humidity
      description: "Relative humidity percentage"
      type:
        double:
          accessMode: ReadOnly
          defaultValue: 0.0
```

```yaml
# apps/edge/devices/site-001-sensor.yaml
apiVersion: devices.kubeedge.io/v1beta1
kind: DeviceInstance
metadata:
  name: temp-sensor-001
  namespace: edge-workloads
spec:
  deviceModelRef:
    name: temperature-sensor
  nodeName: edge-device-001
  protocol:
    modbus:
      slaveID: 1
  propertyVisitors:
    - propertyName: temperature
      modbus:
        register: CoilRegister
        offset: 2
        limit: 1
```

## Step 5: Handle Edge-Specific Secrets

Edge devices may need different credentials than cloud workloads. Use Sealed Secrets for each edge site.

```bash
# Create a site-specific secret for edge-device-001
kubectl create secret generic edge-site-credentials \
  --from-literal=api-key="$EDGE_SITE_001_API_KEY" \
  --dry-run=client -o yaml | \
  kubeseal --namespace edge-workloads \
    --controller-namespace kube-system \
    --format yaml > \
  apps/overlays/edge-device-001/site-credentials-sealed.yaml

git add apps/overlays/edge-device-001/site-credentials-sealed.yaml
git commit -m "feat: add sealed credentials for edge-device-001"
git push
```

## Step 6: Monitor Edge Node Connectivity

```yaml
# Prometheus alert for edge node disconnection
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubeedge-edge-alerts
  namespace: monitoring
spec:
  groups:
    - name: kubeedge.edge
      rules:
        - alert: EdgeNodeDisconnected
          expr: |
            kube_node_status_condition{
              condition="Ready",
              status="true",
              node=~"edge-.*"
            } == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Edge node {{ $labels.node }} is disconnected"
            description: "KubeEdge edge node has been offline for more than 5 minutes"
```

## Best Practices

- Use `nodeSelector: node-role.kubernetes.io/edge: ""` for all edge-targeted workloads to prevent them from scheduling on cloud nodes.
- Set `imagePullPolicy: IfNotPresent` on edge deployments — EdgeCore caches images locally for offline operation.
- Store DeviceModel and DeviceInstance resources in Git for full GitOps coverage of device configuration.
- Use separate namespaces for cloud workloads and edge workloads for clear separation and RBAC.
- Monitor KubeEdge CloudCore metrics to track edge node connectivity rates.
- Design edge workloads to operate autonomously when disconnected from the cloud.

## Conclusion

KubeEdge and Flux CD together create a robust edge-cloud architecture where Git is the authoritative source for both cloud and edge workloads. Flux manages the cloud side, reconciling workload definitions that KubeEdge distributes to edge nodes. Edge nodes run autonomously when disconnected and sync state when reconnected, while Flux provides continuous delivery of configuration updates across the entire fleet.
