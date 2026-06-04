# Set Up OpenYurt for Converting Existing Kubernetes Clusters to Edge Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, OpenYurt

Description: Learn how to convert existing Kubernetes clusters into edge-capable architectures using OpenYurt, enabling cloud-edge coordination while maintaining standard Kubernetes APIs and workflows.

---

You have an existing Kubernetes cluster running in the cloud, and now you need edge capabilities for retail stores, factory floors, or remote sites. Rebuilding your infrastructure from scratch would be expensive and disruptive. OpenYurt solves this by converting standard Kubernetes clusters into edge-cloud unified architectures without requiring complete replacement.

In this guide, you'll transform a vanilla Kubernetes cluster into an edge-capable system using OpenYurt, enabling features like node autonomy, cloud-edge traffic isolation, and edge-specific workload management.

## Understanding OpenYurt's Approach

Unlike purpose-built edge solutions that require special installations, OpenYurt converts existing clusters by installing additional components:

- **Yurt-Manager**: Manages node lifecycles and edge autonomy
- **Raven and Yurt-Tunnel**: Provide cross-region networking and cloud-to-edge maintenance tunnels
- **NodePool**: Groups edge nodes by location or purpose
- **YurtAppSet**: Distributes workloads across NodePools

These components run as standard Kubernetes resources, preserving your existing cluster while adding edge capabilities.

## Prerequisites

You need:

- A running Kubernetes cluster (v1.22+)
- kubectl access with cluster-admin permissions
- Helm 3.x installed
- Edge nodes with container runtime installed

For this guide, we'll use a cluster with 3 cloud nodes and prepare to add edge nodes.

## Installing OpenYurt Components

Install the OpenYurt control-plane components with the official Helm charts:

```bash
helm repo add openyurt https://openyurtio.github.io/openyurt-helm
helm repo update

# Install yurt-manager controllers and webhooks
helm upgrade --install yurt-manager -n kube-system openyurt/yurt-manager

# Install Raven if cloud and edge nodes are in different network areas
helm upgrade --install raven-agent -n kube-system openyurt/raven-agent
```

This installs yurt-manager and, when needed, Raven networking components. Verify installation:

```bash
kubectl get pods -n kube-system | grep -E 'yurt-manager|raven-agent'
```

You should see yurt components running.

## Converting Cloud Nodes

Mark existing nodes as cloud nodes:

```bash
# Label cloud nodes
kubectl label nodes master01 openyurt.io/is-edge-worker=false
kubectl label nodes master02 openyurt.io/is-edge-worker=false
kubectl label nodes master03 openyurt.io/is-edge-worker=false
```

These nodes continue operating normally, handling control plane and cloud workloads.

## Joining Edge Nodes

Add edge nodes to your cluster using yurtadm:

```bash
# Download yurtadm on the edge node
curl -LO https://github.com/openyurtio/openyurt/releases/download/v1.4.0/yurtadm-v1.4.0-linux-amd64.tar.gz
tar -xzf yurtadm-v1.4.0-linux-amd64.tar.gz
sudo install -m 0755 yurtadm /usr/local/bin/yurtadm

# On each edge node, join as an edge node
sudo yurtadm join <k8s-api-ip>:6443 \
  --token <bootstrap-token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --node-name edge-node-01 \
  --node-type=edge
```

The `--node-type=edge` flag tells OpenYurt this is an edge node that needs edge-side components.

Verify edge nodes joined:

```bash
kubectl get nodes -l openyurt.io/is-edge-worker=true
```

## Creating NodePools

NodePools group edge nodes by location or function. Create pools for different edge locations:

```yaml
# nodepool-retail-store-01.yaml
apiVersion: apps.openyurt.io/v1beta1
kind: NodePool
metadata:
  name: retail-store-01
spec:
  type: Edge
  selector:
    matchLabels:
      apps.openyurt.io/nodepool: retail-store-01
```

Apply NodePools:

```bash
kubectl apply -f nodepool-retail-store-01.yaml

# Label nodes to assign them to pools
kubectl label node edge-node-01 apps.openyurt.io/nodepool=retail-store-01
kubectl label node edge-node-02 apps.openyurt.io/nodepool=retail-store-01
```

Check NodePool status:

```bash
kubectl get nodepool
```

## Enabling Node Autonomy

OpenYurt's yurthub component provides autonomy when edge nodes lose cloud connectivity. Configure autonomy settings:

```bash
# Enable autonomy on edge nodes
kubectl annotate node edge-node-01 node.beta.openyurt.io/autonomy=true
kubectl annotate node edge-node-02 node.beta.openyurt.io/autonomy=true
```

When disconnected, edge nodes:

- Cache Kubernetes API responses
- Continue running existing pods
- Can restart pods using cached specs
- Resume syncing when connectivity returns

Test autonomy by simulating network partition:

```bash
# On edge node, block cloud API access
sudo iptables -A OUTPUT -d <k8s-api-ip> -j DROP

# Verify pods keep running
kubectl get pods -o wide

# Restore connectivity
sudo iptables -D OUTPUT -d <k8s-api-ip> -j DROP
```

## Configuring Cloud-Edge Traffic Separation

Use Raven for cross-region cloud-edge traffic:

```bash
# Install Raven for cross-region pod and service communication
helm upgrade --install raven-agent -n kube-system openyurt/raven-agent
```

Raven builds edge-edge and edge-cloud network connectivity across NodePools. Yurt-Tunnel is used for cloud-to-edge maintenance traffic such as logs, exec, and metrics collection when it is deployed.

Verify Raven status:

```bash
kubectl get pods -n kube-system | grep raven-agent
kubectl logs -n kube-system -l app.kubernetes.io/name=raven-agent
```

## Deploying Workloads with YurtAppSet

YurtAppSet distributes applications across multiple NodePools:

```yaml
# retail-app-deployment.yaml
apiVersion: apps.openyurt.io/v1alpha1
kind: YurtAppSet
metadata:
  name: retail-pos-system
  namespace: default
spec:
  selector:
    matchLabels:
      app: pos-system
  workloadTemplate:
    deploymentTemplate:
      metadata:
        labels:
          app: pos-system
      spec:
        replicas: 2
        selector:
          matchLabels:
            app: pos-system
        template:
          metadata:
            labels:
              app: pos-system
          spec:
            containers:
              - name: pos
                image: retail/pos-system:v1.2
                ports:
                  - containerPort: 8080
                resources:
                  requests:
                    cpu: "500m"
                    memory: "512Mi"
  topology:
    pools:
      - name: retail-store-01
        nodeSelectorTerm:
          matchExpressions:
            - key: apps.openyurt.io/nodepool
              operator: In
              values:
                - retail-store-01
        replicas: 2
      - name: retail-store-02
        nodeSelectorTerm:
          matchExpressions:
            - key: apps.openyurt.io/nodepool
              operator: In
              values:
                - retail-store-02
        replicas: 2
      - name: retail-store-03
        nodeSelectorTerm:
          matchExpressions:
            - key: apps.openyurt.io/nodepool
              operator: In
              values:
                - retail-store-03
        replicas: 2
  revisionHistoryLimit: 5
```

Apply the YurtAppSet:

```bash
kubectl apply -f retail-app-deployment.yaml
```

OpenYurt creates 2 replicas in each NodePool, ensuring every store location runs the POS system.

Check deployment status:

```bash
kubectl get yurtappset retail-pos-system
kubectl get deployments -l app=pos-system
```

## Implementing Service Topology

Keep service traffic within NodePools to reduce cross-location latency:

```yaml
# pos-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: pos-service
  namespace: default
  annotations:
    openyurt.io/topologyKeys: "openyurt.io/nodepool"
spec:
  selector:
    app: pos-system
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

The `openyurt.io/topologyKeys` annotation ensures pods only connect to service endpoints in the same NodePool.

## Configuring YurtAppDaemon

YurtAppDaemon deploys template workloads to selected NodePools as those NodePools are created:

```yaml
# monitoring-daemon.yaml
apiVersion: apps.openyurt.io/v1alpha1
kind: YurtAppDaemon
metadata:
  name: edge-monitoring-agent
  namespace: default
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  workloadTemplate:
    deploymentTemplate:
      metadata:
        labels:
          app: monitoring-agent
      spec:
        replicas: 1
        selector:
          matchLabels:
            app: monitoring-agent
        template:
          metadata:
            labels:
              app: monitoring-agent
          spec:
            hostNetwork: true
            containers:
              - name: agent
                image: monitoring/agent:latest
  nodepoolSelector:
    matchLabels:
      yurtappdaemon.openyurt.io/type: monitoring
```

Label each target NodePool to opt in:

```bash
kubectl label nodepool retail-store-01 yurtappdaemon.openyurt.io/type=monitoring
kubectl label nodepool retail-store-02 yurtappdaemon.openyurt.io/type=monitoring
```

This deploys the configured number of replicas per selected NodePool.

## Managing Over-The-Air Updates

Update applications across all edge locations using YurtAppSet:

```bash
# Update the image in retail-app-deployment.yaml, then apply it
kubectl apply -f retail-app-deployment.yaml

# Check rollout status
kubectl get yurtappset retail-pos-system
```

OpenYurt coordinates updates across NodePools, handling connectivity issues gracefully.

For controlled rollouts, use pool-specific replicas:

```yaml
spec:
  topology:
    pools:
      - name: retail-store-01
        replicas: 2
        patch:
          spec:
            template:
              spec:
                containers:
                  - name: pos
                    image: retail/pos-system:v1.3  # Update only store-01
      - name: retail-store-02
        replicas: 2  # Still on v1.2
```

## Monitoring Edge Nodes

Monitor OpenYurt-specific metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: yurt-components
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: yurt-manager
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics to track:

- Node readiness and connectivity state for edge-labeled nodes
- Raven or Yurt-Tunnel pod readiness when those components are deployed
- NodePool status columns such as ready and not-ready node counts
- Workload distribution across generated per-NodePool Deployments

Create alerts for edge issues:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: edge-alerts
spec:
  groups:
    - name: openyurt
      rules:
        - alert: EdgeNodeDisconnected
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node is NotReady"

        - alert: NodePoolUnhealthy
          expr: count(kube_node_status_condition{condition="Ready",status="true"} == 1) / count(kube_node_status_condition{condition="Ready",status="true"}) < 0.5
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Less than 50% of NodePool nodes are ready"
```

## Handling Edge Node Maintenance

Drain edge nodes while maintaining service availability:

```bash
# Cordon node to prevent new pods
kubectl cordon edge-node-01

# Drain pods to other nodes in NodePool
kubectl drain edge-node-01 \
  --ignore-daemonsets \
  --delete-emptydir-data

# Perform maintenance...

# Uncordon node
kubectl uncordon edge-node-01
```

YurtAppSet automatically reconciles the per-NodePool workloads.

## Migrating Existing Workloads

Convert existing Deployments to YurtAppSets:

```bash
# Export existing deployment
kubectl get deployment my-app -o yaml > my-app.yaml

# Create YurtAppSet wrapper
cat > yurtappset-my-app.yaml <<EOF
apiVersion: apps.openyurt.io/v1alpha1
kind: YurtAppSet
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  workloadTemplate:
    deploymentTemplate:
$(cat my-app.yaml | grep -A 100 "spec:" | sed 's/^/      /')
  topology:
    pools:
      - name: retail-store-01
        nodeSelectorTerm:
          matchExpressions:
            - key: apps.openyurt.io/nodepool
              operator: In
              values:
                - retail-store-01
        replicas: 1
      - name: retail-store-02
        nodeSelectorTerm:
          matchExpressions:
            - key: apps.openyurt.io/nodepool
              operator: In
              values:
                - retail-store-02
        replicas: 1
EOF

# Delete old deployment
kubectl delete deployment my-app

# Apply YurtAppSet
kubectl apply -f yurtappset-my-app.yaml
```

## Conclusion

OpenYurt transforms standard Kubernetes clusters into edge-capable platforms without requiring infrastructure replacement. By adding NodePools, autonomy, and edge-aware workload management, you get cloud-edge coordination while preserving Kubernetes APIs and workflows.

Start by converting a test cluster, validate autonomy and failover behavior, then gradually migrate production workloads to YurtAppSet for multi-location management. The non-intrusive architecture means you can adopt edge capabilities incrementally as your needs grow.
