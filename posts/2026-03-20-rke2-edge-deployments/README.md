# How to Configure RKE2 for Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Edge Computing, IoT, Configuration

Description: Learn how to configure and optimize RKE2 for edge deployments with limited resources, unreliable connectivity, and remote management requirements.

## Introduction

Edge deployments present unique challenges for Kubernetes clusters: limited compute resources, constrained bandwidth, intermittent connectivity, and the need for autonomous operation without constant access to a central control plane. RKE2's security-first design and configurable packaged components make it well-suited for edge environments. This guide covers the key configurations needed to run RKE2 reliably at the edge.

## Edge Deployment Challenges

- Limited CPU, memory, and storage
- Intermittent or low-bandwidth network connectivity
- Remote locations with no on-site IT staff
- Physical security concerns
- Requirement for autonomous operation during connectivity loss

## Step 1: Minimal Resource Configuration

Configure RKE2 to use the minimum required resources on resource-constrained edge hardware.

```yaml
# /etc/rancher/rke2/config.yaml

token: "EdgeClusterToken"

# Disable components not needed at the edge to save resources
disable:
  - rke2-metrics-server  # Disable metrics server if not needed
  - rke2-ingress-nginx   # Use a lighter ingress or none

# Use a lightweight CNI
cni: flannel

# Limit kube-apiserver resource usage
kube-apiserver-arg:
  - "max-requests-inflight=200"
  - "max-mutating-requests-inflight=100"

# For RKE2 v1.32 and newer, tune kubelet in a config drop-in
# at /var/lib/rancher/rke2/agent/etc/kubelet.conf.d/10-edge.conf
```

```yaml
# /var/lib/rancher/rke2/agent/etc/kubelet.conf.d/10-edge.conf
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 50
kubeReserved:
  cpu: "200m"
  memory: "256Mi"
systemReserved:
  cpu: "200m"
  memory: "256Mi"
evictionHard:
  memory.available: "100Mi"
  nodefs.available: "5%"
mergeDefaultEvictionSettings: true
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 70
```

## Step 2: Configure etcd for Reliability on Edge

For single-node edge deployments, configure etcd to handle restarts and storage constraints:

```yaml
# /etc/rancher/rke2/config.yaml
# etcd snapshot configuration
etcd-snapshot-schedule-cron: "0 */6 * * *"  # Every 6 hours
etcd-snapshot-retention: 5                   # Keep 5 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots

# Tune etcd for lower-resource nodes
etcd-arg:
  - "heartbeat-interval=500"    # Increase heartbeat interval (ms)
  - "election-timeout=5000"     # Increase election timeout for flaky networks
  - "snapshot-count=5000"       # Snapshot frequency
  - "quota-backend-bytes=2147483648"  # 2GB backend quota
```

## Step 3: Configure Node Labels for Edge Location

Label nodes to identify their physical location for workload targeting:

```bash
# Label a node with its edge location
kubectl label node edge-node-001 \
  topology.kubernetes.io/region=us-east \
  topology.kubernetes.io/zone=datacenter-1 \
  node-role.kubernetes.io/edge=true \
  location=warehouse-a

# Use nodeSelector in your deployments to target specific edge locations
```

## Step 4: Deploy with Offline/Air-Gapped Images

Edge nodes may not have internet access. Pre-load container images:

```bash
# On a connected machine, pull and save images
docker pull my-app:1.0
docker save my-app:1.0 | gzip > my-app-1.0.tar.gz

# Transfer to the edge node (via USB, SCP, etc.)
scp my-app-1.0.tar.gz edge-user@edge-node:/tmp/

# On the edge node, import the image into containerd
sudo /var/lib/rancher/rke2/bin/ctr \
    --address /run/k3s/containerd/containerd.sock \
    --namespace k8s.io \
    images import /tmp/my-app-1.0.tar.gz
```

## Step 5: Configure Private Registry for Edge

Instead of Docker Hub, point edge nodes to a local or regional registry:

```bash
sudo mkdir -p /etc/rancher/rke2/

sudo tee /etc/rancher/rke2/registries.yaml > /dev/null <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "http://registry.local:5000"
  "registry.k8s.io":
    endpoint:
      - "http://registry.local:5000"
configs:
  "registry.local:5000":
    auth:
      username: admin
      password: password
EOF

# Restart RKE2 if registries.yaml was changed after startup
sudo systemctl restart rke2-server
```

## Step 6: Autonomous Operation with Local Storage

Edge clusters should function without cloud storage dependencies. Configure local persistent storage:

```bash
# RKE2 does not install a default local storage provisioner.
# Install Rancher's Local Path Provisioner first.
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml

# Configure a storage class for edge workloads
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: edge-local
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
EOF
```

## Step 7: Watchdog and Auto-Recovery

Configure systemd to automatically restart RKE2 if it crashes:

```bash
# Create a systemd override for rke2-server
sudo mkdir -p /etc/systemd/system/rke2-server.service.d/

sudo tee /etc/systemd/system/rke2-server.service.d/override.conf > /dev/null <<EOF
[Service]
# Restart the service if it fails
Restart=always
RestartSec=10
# Wait up to 5 minutes for the service to start
TimeoutStartSec=300
EOF

sudo systemctl daemon-reload
sudo systemctl restart rke2-server
```

## Step 8: Configure a Lightweight Ingress

Replace NGINX Ingress with a lighter alternative for resource-constrained nodes:

```yaml
# /etc/rancher/rke2/config.yaml
# Disable default ingress
disable:
  - rke2-ingress-nginx
```

Then deploy Traefik or a minimal NGINX:

```yaml
# lightweight-ingress.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traefik-ingress-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: traefik-ingress-controller
rules:
  - apiGroups:
      - ""
    resources:
      - services
      - secrets
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - discovery.k8s.io
    resources:
      - endpointslices
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - extensions
      - networking.k8s.io
    resources:
      - ingresses
      - ingressclasses
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - extensions
      - networking.k8s.io
    resources:
      - ingresses/status
    verbs:
      - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: traefik-ingress-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: traefik-ingress-controller
subjects:
  - kind: ServiceAccount
    name: traefik-ingress-controller
    namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: traefik
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik-ingress-controller
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
      containers:
        - name: traefik
          image: traefik:v3.2
          args:
            - "--providers.kubernetesingress=true"
            - "--entrypoints.web.address=:80"
          ports:
            - containerPort: 80
              hostPort: 80
```

## Step 9: Monitoring Edge Clusters with OneUptime

Use OneUptime for lightweight remote monitoring of your edge clusters:

```bash
# Create a namespace and token secret for an OpenTelemetry Collector
kubectl create namespace observability

kubectl -n observability create secret generic oneuptime-otlp \
    --from-literal=ONEUPTIME_TOKEN=YOUR_ONEUPTIME_TOKEN

# Reference this secret as the ONEUPTIME_TOKEN environment variable
# in your OpenTelemetry Collector deployment.
```

Configure your OpenTelemetry Collector OTLP exporter to send telemetry to OneUptime:

```yaml
exporters:
  otlp/oneuptime:
    endpoint: "https://otlp.oneuptime.com"
    headers:
      x-oneuptime-token: "${env:ONEUPTIME_TOKEN}"
```

## Conclusion

Configuring RKE2 for edge deployments requires careful resource tuning, offline image support, autonomous recovery mechanisms, and lightweight component selection. By disabling unnecessary services, pre-loading images, configuring local storage, and adding systemd auto-restart policies, you can build a resilient edge Kubernetes cluster that operates reliably even with intermittent connectivity and limited hardware resources.
