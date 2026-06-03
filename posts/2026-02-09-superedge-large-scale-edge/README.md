# How to Deploy SuperEdge for Managing Large-Scale Edge Node Fleets

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

SuperEdge's published installation examples target Kubernetes 1.18.x, and the edgeadm guide recommends Kubernetes 1.18 or later. Check the compatibility notes for the SuperEdge release you plan to run:

```bash
kubectl version -o yaml
```

## Installing SuperEdge Cloud Components

Deploy SuperEdge components to the cloud control plane using the provided edgeadm workflow or the official manifests:

```bash
# Download SuperEdge
git clone https://github.com/superedge/superedge.git
cd superedge

# Download edgeadm from the SuperEdge release for your CPU architecture,
# then convert an existing kubeadm cluster into an edge cluster.
edgeadm change
```

Alternatively, install individual manifests for more control:

```yaml
# superedge-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: edge-system
```

Deploy the tunnel cloud component from the official manifest after filling in the certificate and token placeholders in `deployment/tunnel-cloud.yaml`:

```bash
kubectl apply -f deployment/tunnel-coredns.yaml

# Fill in TunnelCloudEdgeToken, TunnelPersistentConnectionServerKey,
# TunnelPersistentConnectionServerCrt, TunnelProxyServerKey, and
# TunnelProxyServerCrt before applying this manifest.
kubectl apply -f deployment/tunnel-cloud.yaml
```

Deploy the application-grid-controller for managing edge applications:

```yaml
# application-grid-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-grid-controller
  namespace: edge-system
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
      - name: application-grid-controller
        image: superedge.tencentcloudcr.com/superedge/application-grid-controller:v0.7.0
        command:
        - /usr/local/bin/application-grid-controller
        args:
        - --feature-gates=EndpointSlice=true
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
  namespace: edge-system
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
  namespace: edge-system
```

Apply all cloud components:

```bash
kubectl apply -f superedge-namespace.yaml
kubectl apply -f tunnel-cloud.yaml
kubectl apply -f application-grid-rbac.yaml
kubectl apply -f application-grid-controller.yaml

# Verify deployment
kubectl get pods -n edge-system
```

## Configuring Edge Nodes

Add edge nodes to your cluster using kubeadm, then install SuperEdge edge components from the official manifests. For tunnel support, fill in the placeholders in `deployment/tunnel-edge.yaml`, including the tunnel cloud endpoint, token, and certificates:

```bash
#!/bin/bash
# install-superedge-edge.sh

# Apply on edge worker nodes after configuring deployment/tunnel-edge.yaml.
kubectl apply -f deployment/tunnel-edge.yaml

# Fill in HmacKey in deployment/edge-health.yaml before applying it.
kubectl apply -f deployment/edge-health-admission.yaml
kubectl apply -f deployment/edge-health-webhook.yaml
kubectl apply -f deployment/edge-health.yaml
```

Label edge nodes to identify them for SuperEdge management:

```bash
# Label edge nodes
kubectl label node edge-node-1 node-role.kubernetes.io/edge=
kubectl label node edge-node-2 node-role.kubernetes.io/edge=

# Verify labels
kubectl get nodes -l node-role.kubernetes.io/edge
```

## Creating Node Units for Topology Management

Organize edge nodes into logical node units based on geographic location or network topology. SuperEdge's ServiceGroup resources use the value of `gridUniqKey` as the node label key, and nodes with the same label value belong to the same node unit:

```bash
kubectl label node edge-node-1 zone=us-west
kubectl label node edge-node-2 zone=us-west
kubectl label node edge-node-3 zone=us-east
kubectl label node edge-node-4 zone=us-east
kubectl label node edge-node-5 zone=eu-central
kubectl label node edge-node-6 zone=eu-central
```

For multi-region edge-health detection, label nodes with SuperEdge's health topology label and enable the zone ConfigMap:

```yaml
# edge-health-zone-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edge-health-zone-config
  namespace: edge-system
data:
  TaintZoneAdmission: "true"
```

Label nodes with their regions:

```bash
# US West nodes
kubectl label node edge-node-1 superedgehealth/topology-zone=us-west
kubectl label node edge-node-2 superedgehealth/topology-zone=us-west

# US East nodes
kubectl label node edge-node-3 superedgehealth/topology-zone=us-east
kubectl label node edge-node-4 superedgehealth/topology-zone=us-east

# EU Central nodes
kubectl label node edge-node-5 superedgehealth/topology-zone=eu-central
kubectl label node edge-node-6 superedgehealth/topology-zone=eu-central
```

## Deploying Applications with ServiceGrid

ServiceGroup provides DeploymentGrid for deploying workloads across node units and ServiceGrid for keeping service traffic inside the same node unit. Create a DeploymentGrid that deploys to all regions:

```yaml
# app-deploymentgrid.yaml
apiVersion: superedge.io/v1
kind: DeploymentGrid
metadata:
  name: edge-app
  namespace: default
spec:
  # Define the grid structure
  gridUniqKey: zone
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

This creates 3 replicas of the application in each node unit, ensuring regional deployment and fault tolerance.

Create the corresponding ServiceGrid with the same `gridUniqKey`:

```yaml
# app-servicegrid.yaml
apiVersion: superedge.io/v1
kind: ServiceGrid
metadata:
  name: edge-app
  namespace: default
spec:
  gridUniqKey: zone
  template:
    selector:
      app: edge-app
    ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

ServiceGrid creates a Kubernetes Service that routes requests from a node unit to endpoints in the same node unit. Do not use Kubernetes `spec.topologyKeys` for new clusters; that alpha Service topology field was deprecated in Kubernetes 1.21 and removed after Kubernetes 1.22.

Deploy the application:

```bash
kubectl apply -f app-deploymentgrid.yaml
kubectl apply -f app-servicegrid.yaml

# Verify deployment across regions
kubectl get pods -o wide -l app=edge-app
```

## Configuring Edge Autonomy

Edge autonomy ensures that edge nodes continue operating when disconnected from the cloud control plane. Configure autonomy settings for critical workloads:

```bash
# Let pods reach the local lite-apiserver instead of depending directly on the cloud API server.
kubectl annotate endpoints kubernetes superedge.io/local-endpoint=127.0.0.1
kubectl annotate endpoints kubernetes superedge.io/local-port=51003
```

This configuration is part of SuperEdge's L3 edge autonomy design: lite-apiserver proxies edge-side API requests, tunnel handles cloud-to-edge access, and edge-health keeps healthy edge nodes from being incorrectly marked unhealthy during cloud-edge network interruptions.

## Implementing Distributed Health Checking

SuperEdge's edge-health component performs distributed health checks across edge nodes, detecting failures without requiring cloud communication:

```yaml
# edge-health-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hmac-config
  namespace: edge-system
data:
  hmackey: "replace-with-at-least-16-characters"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edge-health
  namespace: edge-system
spec:
  selector:
    matchLabels:
      name: edge-health
  template:
    metadata:
      labels:
        name: edge-health
    spec:
      serviceAccountName: edge-health
      hostNetwork: true
      containers:
      - name: edge-health
        image: superedge.tencentcloudcr.com/superedge/edge-health:v0.7.0
        command:
        - edge-health
        args:
        - --kubeletauthplugin=timeout=5,retrytime=3,weight=1,port=10250
        - --v=2
```

Edge-health uses kubelet health check plugins and communication between edge-health instances. For region isolation, use the `superedgehealth/topology-zone` node label and the `edge-health-zone-config` ConfigMap shown earlier.

## Monitoring Large-Scale Edge Fleets

Deploy Prometheus and Grafana to monitor your edge fleet:

```yaml
# edge-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: edge-system
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
          - edge-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app, __meta_kubernetes_pod_label_name]
        separator: ";"
        regex: (tunnel-cloud|application-grid-controller);|;edge-health
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
# Port forward to Prometheus, if you deploy it in edge-system
kubectl port-forward -n edge-system svc/prometheus 9090:9090

# Inspect the metrics exposed by the component versions you deploy and build
# alerts around tunnel availability, node readiness, and edge-health logs.
```

## Conclusion

SuperEdge provides the tools needed to manage Kubernetes deployments across thousands of edge nodes distributed globally. The combination of edge autonomy, distributed health checking, and topology-aware routing ensures that edge applications remain operational and performant even during network disruptions.

This architecture scales to manage large edge fleets while maintaining the familiar Kubernetes API and operational model. SuperEdge handles the complexity of edge computing while preserving the declarative, self-healing properties that make Kubernetes powerful.

For production deployments, implement comprehensive monitoring of edge node health, establish clear node grouping strategies based on your network topology, and test autonomy behavior thoroughly to ensure edge workloads handle cloud disconnection gracefully.
