# How to Set Up OpenYurt for Converting Existing Kubernetes Clusters to Edge Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, OpenYurt

Description: Learn how to convert existing Kubernetes clusters into edge-capable architectures using OpenYurt, enabling cloud-edge coordination while maintaining standard Kubernetes APIs and workflows.

---

You have an existing Kubernetes cluster running in the cloud, and now you need edge capabilities for retail stores, factory floors, or remote sites. Rebuilding your infrastructure from scratch would be expensive and disruptive. OpenYurt solves this by converting standard Kubernetes clusters into edge-cloud unified architectures without requiring complete replacement.

In this guide, you'll transform a vanilla Kubernetes cluster into an edge-capable system using OpenYurt, enabling features like node autonomy, cloud-edge traffic isolation, and edge-specific workload management.

## Understanding OpenYurt's Approach

Unlike purpose-built edge solutions that require special installations, OpenYurt converts existing clusters by installing additional components:

- **Yurt-Manager**: Manages node lifecycles and edge autonomy
- **Yurt-Tunnel**: Provides secure cloud-to-edge communication through NAT
- **NodePool**: Groups edge nodes by location or purpose
- **UnitedDeployment**: Distributes workloads across NodePools

These components run as standard Kubernetes resources, preserving your existing cluster while adding edge capabilities.

## Prerequisites

You need:

- A running Kubernetes cluster (v1.22+)
- kubectl access with cluster-admin permissions
- Helm 3.x installed
- Edge nodes with container runtime installed

For this guide, we'll use a cluster with 3 cloud nodes and prepare to add edge nodes.

## Installing OpenYurt Components

Install OpenYurt using the official installer:

```bash
# Download yurtadm
wget https://github.com/openyurtio/openyurt/releases/download/v1.4.0/yurtadm
chmod +x yurtadm
sudo mv yurtadm /usr/local/bin/

# Convert cluster to OpenYurt
yurtadm init --apiserver-advertise-address=<your-k8s-api-ip> \
  --yurthub-image=openyurt/yurthub:v1.4.0 \
  --enable-app-manager
```

This installs yurt-manager, yurt-tunnel, and yurt-controller-manager. Verify installation:

```bash
kubectl get pods -n kube-system | grep yurt
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
# On each edge node, join as an edge node
sudo yurtadm join <k8s-api-ip>:6443 \
  --token <bootstrap-token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --node-name edge-node-01 \
  --edge-worker
```

The `--edge-worker` flag tells OpenYurt this is an edge node that needs autonomy features.

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
      location: store-01
  taints:
    - key: apps.openyurt.io/example
      value: test
      effect: NoSchedule
```

Apply NodePools:

```bash
kubectl apply -f nodepool-retail-store-01.yaml

# Label nodes to assign them to pools
kubectl label node edge-node-01 location=store-01
kubectl label node edge-node-02 location=store-01
```

Check NodePool status:

```bash
kubectl get nodepool
```

## Enabling Node Autonomy

OpenYurt's yurthub component provides autonomy when edge nodes lose cloud connectivity. Configure autonomy settings:

```yaml
# Edit yurthub ConfigMap
kubectl edit configmap yurt-hub-cfg -n kube-system

# Add autonomy settings:
data:
  cache_agents: "kubelet,kube-proxy,flanneld"
  working_mode: "edge"
  node_pool_name: "retail-store-01"
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

Use Yurt-Tunnel for secure cloud-to-edge communication:

```yaml
# tunnel-server.yaml
apiVersion: v1
kind: Service
metadata:
  name: yurt-tunnel-server
  namespace: kube-system
spec:
  selector:
    app: yurt-tunnel-server
  ports:
    - name: tcp
      port: 10262
      targetPort: 10262
      protocol: TCP
  type: ClusterIP
```

Edge nodes connect to tunnel-server, creating reverse tunnels for cloud-initiated connections.

Verify tunnel status:

```bash
kubectl get pods -n kube-system -l app=yurt-tunnel-server
kubectl logs -n kube-system -l app=yurt-tunnel-server
```

## Deploying Workloads with UnitedDeployment

UnitedDeployment distributes applications across multiple NodePools:

```yaml
# retail-app-deployment.yaml
apiVersion: apps.openyurt.io/v1alpha1
kind: UnitedDeployment
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
        replicas: 2
      - name: retail-store-02
        replicas: 2
      - name: retail-store-03
        replicas: 2
  revisionHistoryLimit: 5
```

Apply the UnitedDeployment:

```bash
kubectl apply -f retail-app-deployment.yaml
```

OpenYurt creates 2 replicas in each NodePool, ensuring every store location runs the POS system.

Check deployment status:

```bash
kubectl get uniteddeployment retail-pos-system
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

YurtAppDaemon deploys pods to all nodes in NodePools, like a DaemonSet with NodePool awareness:

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
                env:
                  - name: NODE_POOL
                    valueFrom:
                      fieldRef:
                        fieldPath: metadata.annotations['apps.openyurt.io/nodepool']
  nodepoolSelector:
    matchLabels:
      type: Edge
```

This deploys one monitoring agent per NodePool, not per node, reducing overhead.

## Managing Over-The-Air Updates

Update applications across all edge locations using UnitedDeployment:

```bash
# Update image for all locations
kubectl set image uniteddeployment/retail-pos-system \
  pos=retail/pos-system:v1.3

# Check rollout status
kubectl rollout status uniteddeployment/retail-pos-system
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

- Node autonomy status
- Tunnel connection health
- NodePool workload distribution
- Edge node connectivity duration

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
          expr: yurt_node_autonomy_enabled == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Edge node operating in autonomy mode"

        - alert: NodePoolUnhealthy
          expr: yurt_nodepool_ready_nodes / yurt_nodepool_total_nodes < 0.5
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

UnitedDeployment automatically redistributes workloads within the NodePool.

## Migrating Existing Workloads

Convert existing Deployments to UnitedDeployments:

```bash
# Export existing deployment
kubectl get deployment my-app -o yaml > my-app.yaml

# Create UnitedDeployment wrapper
cat > united-my-app.yaml <<EOF
apiVersion: apps.openyurt.io/v1alpha1
kind: UnitedDeployment
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
        replicas: 1
      - name: retail-store-02
        replicas: 1
EOF

# Delete old deployment
kubectl delete deployment my-app

# Apply UnitedDeployment
kubectl apply -f united-my-app.yaml
```

## Conclusion

OpenYurt transforms standard Kubernetes clusters into edge-capable platforms without requiring infrastructure replacement. By adding NodePools, autonomy, and edge-aware workload management, you get cloud-edge coordination while preserving Kubernetes APIs and workflows.

Start by converting a test cluster, validate autonomy and failover behavior, then gradually migrate production workloads to UnitedDeployment for multi-location management. The non-intrusive architecture means you can adopt edge capabilities incrementally as your needs grow.
