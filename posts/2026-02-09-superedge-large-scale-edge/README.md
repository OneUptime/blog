# How to Deploy SuperEdge for Managing Large-Scale Edge Node Fleets with Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SuperEdge, Edge Computing, Fleet Management, Cloud Native

Description: Learn how to deploy and configure SuperEdge to manage thousands of edge nodes at scale, including edge autonomy, distributed health checking, and service topology-aware routing.

---

Managing large-scale edge deployments with thousands of nodes distributed across geographic regions presents unique challenges. SuperEdge extends Kubernetes with capabilities specifically designed for edge computing at scale, including edge autonomy during network failures, distributed health checking, and topology-aware service routing.

In this guide, we'll deploy SuperEdge to manage a large fleet of edge nodes, configure edge autonomy features that keep nodes operational during cloud disconnection, and implement service topology routing that minimizes cross-region traffic.

## Understanding SuperEdge Architecture

SuperEdge builds on Kubernetes to add edge-specific capabilities without modifying core Kubernetes components. The architecture includes cloud-side components that run in your Kubernetes control plane and edge-side components that run on each edge node.

Key components include edge-health for distributed health checking across edge nodes, application-grid-controller for managing applications across edge regions, and tunnel for stable cloud-edge networking. These components work together to provide edge autonomy, where edge nodes continue operating even when disconnected from the cloud control plane.

SuperEdge organizes edge nodes into node groups based on network topology, enabling topology-aware routing where service traffic prefers endpoints in the same region. This reduces latency and bandwidth costs in geographically distributed deployments.

## Prerequisites and Cluster Setup

Before deploying SuperEdge, prepare a Kubernetes cluster with a control plane in your cloud or data center. Edge nodes will join this cluster and be managed by SuperEdge components.

Verify your cluster is ready:

```bash
# Check cluster status
kubectl cluster-info
kubectl get nodes

# Ensure you have cluster-admin permissions
kubectl auth can-i '*' '*'
```

SuperEdge requires Kubernetes 1.20 or later. Ensure your cluster meets the version requirement:

```bash
kubectl version --short
```

## Installing SuperEdge Cloud Components

Deploy SuperEdge components to the cloud control plane using the provided installation script:

```bash
# Download SuperEdge
git clone https://github.com/superedge/superedge.git
cd superedge

# Install cloud components
kubectl apply -f deployment/superedge-cloud.yaml
```

Alternatively, install using individual manifests for more control:

```yaml
# superedge-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: superedge-system
```

Deploy the tunnel cloud component for stable networking:

```yaml
# tunnel-cloud.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tunnel-cloud
  namespace: superedge-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tunnel-cloud
  template:
    metadata:
      labels:
        app: tunnel-cloud
    spec:
      containers:
      - name: tunnel-cloud
        image: superedge/tunnel:latest
        command:
        - tunnel
        args:
        - --mode=cloud
        - --v=4
        ports:
        - containerPort: 9000
          name: proxy
        - containerPort: 51010
          name: tunnel
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: tunnel-cloud
  namespace: superedge-system
spec:
  type: LoadBalancer
  selector:
    app: tunnel-cloud
  ports:
  - port: 9000
    name: proxy
    targetPort: 9000
  - port: 51010
    name: tunnel
    targetPort: 51010
```

Deploy the application-grid-controller for managing edge applications:

```yaml
# application-grid-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-grid-controller
  namespace: superedge-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: application-grid-controller
  template:
    metadata:
      labels:
        app: application-grid-controller
    spec:
      serviceAccountName: application-grid-controller
      containers:
      - name: controller
        image: superedge/application-grid-controller:latest
        command:
        - application-grid-controller
        args:
        - --v=4
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
```

Create the required ServiceAccount and RBAC:

```yaml
# application-grid-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: application-grid-controller
  namespace: superedge-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-grid-controller
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: application-grid-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-grid-controller
subjects:
- kind: ServiceAccount
  name: application-grid-controller
  namespace: superedge-system
```

Apply all cloud components:

```bash
kubectl apply -f superedge-namespace.yaml
kubectl apply -f tunnel-cloud.yaml
kubectl apply -f application-grid-rbac.yaml
kubectl apply -f application-grid-controller.yaml

# Verify deployment
kubectl get pods -n superedge-system
```

## Configuring Edge Nodes

Add edge nodes to your cluster using kubeadm or k3s, then install SuperEdge edge components. Create an installation script for edge nodes:

```bash
#!/bin/bash
# install-superedge-edge.sh

# Get tunnel cloud service endpoint
TUNNEL_CLOUD_IP="<TUNNEL_CLOUD_LOADBALANCER_IP>"
TUNNEL_CLOUD_PORT="51010"

# Install edge components
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edge-health
  namespace: superedge-system
spec:
  selector:
    matchLabels:
      app: edge-health
  template:
    metadata:
      labels:
        app: edge-health
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/edge
                operator: Exists
      hostNetwork: true
      containers:
      - name: edge-health
        image: superedge/edge-health:latest
        command:
        - edge-health
        args:
        - --v=4
        securityContext:
          privileged: true
        volumeMounts:
        - name: kubelet
          mountPath: /var/lib/kubelet
          readOnly: true
      volumes:
      - name: kubelet
        hostPath:
          path: /var/lib/kubelet
EOF
```

Label edge nodes to identify them for SuperEdge management:

```bash
# Label edge nodes
kubectl label node edge-node-1 node-role.kubernetes.io/edge=
kubectl label node edge-node-2 node-role.kubernetes.io/edge=

# Verify labels
kubectl get nodes -l node-role.kubernetes.io/edge
```

## Creating Node Groups for Topology Management

Organize edge nodes into logical groups based on geographic location or network topology. SuperEdge uses these groups for topology-aware routing:

```yaml
# node-group-us-west.yaml
apiVersion: superedge.io/v1
kind: NodeGroup
metadata:
  name: us-west
spec:
  # Selector for nodes in this group
  selector:
    matchLabels:
      topology.superedge.io/region: us-west
  # Edge autonomy settings
  autonomy:
    enabled: true
    # Keep running during cloud disconnection
    cloudDisconnectDuration: 10m
```

Create node groups for different regions:

```yaml
# node-groups.yaml
apiVersion: superedge.io/v1
kind: NodeGroup
metadata:
  name: us-west
spec:
  selector:
    matchLabels:
      topology.superedge.io/region: us-west
  autonomy:
    enabled: true
---
apiVersion: superedge.io/v1
kind: NodeGroup
metadata:
  name: us-east
spec:
  selector:
    matchLabels:
      topology.superedge.io/region: us-east
  autonomy:
    enabled: true
---
apiVersion: superedge.io/v1
kind: NodeGroup
metadata:
  name: eu-central
spec:
  selector:
    matchLabels:
      topology.superedge.io/region: eu-central
  autonomy:
    enabled: true
```

Label nodes with their regions:

```bash
# US West nodes
kubectl label node edge-node-1 topology.superedge.io/region=us-west
kubectl label node edge-node-2 topology.superedge.io/region=us-west

# US East nodes
kubectl label node edge-node-3 topology.superedge.io/region=us-east
kubectl label node edge-node-4 topology.superedge.io/region=us-east

# EU Central nodes
kubectl label node edge-node-5 topology.superedge.io/region=eu-central
kubectl label node edge-node-6 topology.superedge.io/region=eu-central
```

## Deploying Applications with ServiceGrid

ServiceGrid is SuperEdge's abstraction for deploying services across node groups with topology-aware routing. Create a ServiceGrid that deploys to all regions:

```yaml
# app-servicegrid.yaml
apiVersion: superedge.io/v1
kind: ServiceGrid
metadata:
  name: edge-app
  namespace: default
spec:
  # Define the grid structure
  gridUniqKey: topology.superedge.io/region
  template:
    replicas: 3
    selector:
      matchLabels:
        app: edge-app
    template:
      metadata:
        labels:
          app: edge-app
      spec:
        containers:
        - name: app
          image: nginx:latest
          ports:
          - containerPort: 80
          resources:
            requests:
              cpu: "100m"
              memory: "64Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

This creates 3 replicas of the application in each node group, ensuring regional deployment and fault tolerance.

Create the corresponding service with topology-aware routing:

```yaml
# app-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: edge-app
  namespace: default
  annotations:
    topologyKeys: topology.superedge.io/region
spec:
  selector:
    app: edge-app
  ports:
  - port: 80
    targetPort: 80
  # Enable topology-aware routing
  topologyKeys:
  - topology.superedge.io/region
  - "*"
```

The `topologyKeys` annotation ensures that service traffic routes to endpoints in the same region first, falling back to other regions only if local endpoints are unavailable.

Deploy the application:

```bash
kubectl apply -f app-servicegrid.yaml
kubectl apply -f app-service.yaml

# Verify deployment across regions
kubectl get pods -o wide -l app=edge-app
```

## Configuring Edge Autonomy

Edge autonomy ensures that edge nodes continue operating when disconnected from the cloud control plane. Configure autonomy settings for critical workloads:

```yaml
# autonomy-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edge-autonomy-config
  namespace: superedge-system
data:
  # Grace period before marking cloud as unreachable
  cloud-disconnect-threshold: "5m"
  # How long to maintain autonomy
  autonomy-duration: "24h"
  # Cache pod specs locally
  cache-pod-specs: "true"
  # Allow pod restarts during autonomy
  allow-pod-restart: "true"
```

This configuration allows edge nodes to operate autonomously for 24 hours during cloud disconnection, restarting pods as needed using cached specifications.

## Implementing Distributed Health Checking

SuperEdge's edge-health component performs distributed health checks across edge nodes, detecting failures without requiring cloud communication:

```yaml
# edge-health-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edge-health-config
  namespace: superedge-system
data:
  edge-health.yaml: |
    # Health check plugins
    plugins:
      - name: ping
        enabled: true
        interval: 30s
        timeout: 5s
      - name: kubelet
        enabled: true
        interval: 30s
        timeout: 5s

    # Distributed health check settings
    check:
      # Number of neighbor nodes to check
      neighbors: 3
      # Threshold for marking node unhealthy
      unhealthyThreshold: 3
      # Threshold for marking node healthy
      healthyThreshold: 1
```

Edge-health distributes health check responsibilities across nodes in the same region, eliminating single points of failure in health monitoring.

## Monitoring Large-Scale Edge Fleets

Deploy Prometheus and Grafana to monitor your edge fleet:

```yaml
# edge-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: superedge-system
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s

    scrape_configs:
    # Scrape SuperEdge components
    - job_name: 'superedge'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - superedge-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: (tunnel-cloud|edge-health|application-grid-controller)
        action: keep

    # Scrape edge applications
    - job_name: 'edge-apps'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_node_name]
        regex: edge-.*
        action: keep
```

View edge fleet metrics:

```bash
# Port forward to Prometheus
kubectl port-forward -n superedge-system svc/prometheus 9090:9090

# Key metrics to monitor:
# - superedge_edge_health_check_success
# - superedge_tunnel_connections
# - superedge_autonomy_status
```

## Conclusion

SuperEdge provides the tools needed to manage Kubernetes deployments across thousands of edge nodes distributed globally. The combination of edge autonomy, distributed health checking, and topology-aware routing ensures that edge applications remain operational and performant even during network disruptions.

This architecture scales to manage large edge fleets while maintaining the familiar Kubernetes API and operational model. SuperEdge handles the complexity of edge computing while preserving the declarative, self-healing properties that make Kubernetes powerful.

For production deployments, implement comprehensive monitoring of edge node health, establish clear node grouping strategies based on your network topology, and test autonomy behavior thoroughly to ensure edge workloads handle cloud disconnection gracefully.
