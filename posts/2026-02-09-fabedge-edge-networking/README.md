# How to Deploy FabEdge for Edge-to-Edge Container Networking Across Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, Networking

Description: Learn how to deploy FabEdge to enable direct pod-to-pod communication between edge Kubernetes clusters without hairpin routing through the cloud, reducing latency and bandwidth usage for distributed edge applications.

---

Traditional edge architectures route all traffic through central cloud infrastructure, even when edge clusters need to communicate with each other. This hairpin routing adds latency and wastes bandwidth. FabEdge provides edge-to-edge networking that allows pods in different edge clusters to communicate directly, bypassing the cloud for peer communication.

In this guide, you'll deploy FabEdge to create flat networking across multiple edge Kubernetes clusters, enabling efficient distributed applications that span edge locations.

## Understanding FabEdge Architecture

FabEdge is a Kubernetes networking solution specifically designed for edge scenarios:

- Direct pod-to-pod communication across clusters
- Support for NAT traversal and firewall penetration
- Hybrid cloud-edge-edge topology
- Integration with existing CNI plugins
- Low overhead for resource-constrained edge

Unlike traditional service mesh or VPN solutions, FabEdge focuses on efficient edge-specific networking patterns.

## Prerequisites

You need:

- Multiple K3s or K8s edge clusters
- One central cloud cluster (for control plane)
- Network connectivity between sites (can be indirect)
- Helm 3.x installed

## Installing FabEdge Operator

On your cloud cluster, install the FabEdge operator:

```bash
# Add FabEdge Helm repository
helm repo add fabedge https://fabedge.github.io/helm-chart
helm repo update

# Install operator on cloud cluster
helm install fabedge-operator fabedge/fabedge-operator \
  --namespace fabedge \
  --create-namespace \
  --set role=host
```

Verify installation:

```bash
kubectl get pods -n fabedge
```

## Deploying FabEdge Agent on Edge Clusters

On each edge cluster, install the FabEdge agent:

```bash
# Get connector token from cloud cluster
CONNECTOR_TOKEN=$(kubectl get secret -n fabedge fabedge-connector-token -o jsonpath='{.data.token}' | base64 -d)

# Install agent on edge cluster
helm install fabedge-agent fabedge/fabedge-agent \
  --namespace fabedge \
  --create-namespace \
  --set role=member \
  --set connector.server=<cloud-fabedge-ip>:500 \
  --set connector.token=$CONNECTOR_TOKEN \
  --set cluster.name=edge-cluster-01 \
  --set cluster.cidr=10.42.0.0/16
```

Repeat for each edge cluster with unique cluster names and CIDRs.

## Configuring Pod CIDR Allocation

Ensure each cluster has non-overlapping pod CIDRs:

- Cloud cluster: 10.40.0.0/16
- Edge cluster 01: 10.42.0.0/16
- Edge cluster 02: 10.43.0.0/16
- Edge cluster 03: 10.44.0.0/16

Update K3s pod CIDR if needed:

```bash
# Edit K3s config
sudo vi /etc/rancher/k3s/config.yaml

# Add:
cluster-cidr: "10.42.0.0/16"

# Restart K3s
sudo systemctl restart k3s
```

## Creating Community for Edge Clusters

Communities group clusters for direct networking:

```yaml
# edge-community.yaml
apiVersion: fabedge.io/v1alpha1
kind: Community
metadata:
  name: retail-stores
  namespace: fabedge
spec:
  members:
  - name: edge-cluster-01
    role: connector
  - name: edge-cluster-02
    role: connector
  - name: edge-cluster-03
    role: connector
```

Apply on cloud cluster:

```bash
kubectl apply -f edge-community.yaml
```

FabEdge establishes direct connections between community members.

## Verifying Cross-Cluster Connectivity

Deploy test pods on each cluster:

```bash
# On edge-cluster-01
kubectl run test-01 --image=busybox --command -- sleep 3600

# On edge-cluster-02
kubectl run test-02 --image=busybox --command -- sleep 3600

# Get pod IPs
kubectl get pod test-01 -o wide  # e.g., 10.42.1.5
kubectl get pod test-02 -o wide  # e.g., 10.43.1.8
```

Test connectivity:

```bash
# From edge-cluster-01, ping pod in edge-cluster-02
kubectl exec test-01 -- ping -c 3 10.43.1.8
```

Pings should succeed, showing direct edge-to-edge communication.

## Implementing Service Discovery Across Clusters

Export services for cross-cluster access:

```yaml
# exported-service.yaml (on edge-cluster-01)
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: default
  annotations:
    fabedge.io/service-export: "true"
spec:
  selector:
    app: api
  ports:
  - port: 8080
    targetPort: 8080
```

Access from other clusters:

```bash
# From edge-cluster-02
curl http://api-service.default.edge-cluster-01.svc:8080
```

FabEdge creates DNS entries for exported services.

## Configuring Network Policies

Control cross-cluster traffic with NetworkPolicies:

```yaml
# cross-cluster-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-edge-clusters
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          fabedge.io/cluster: edge-cluster-02
    - namespaceSelector:
        matchLabels:
          fabedge.io/cluster: edge-cluster-03
    ports:
    - protocol: TCP
      port: 8080
```

## Implementing High-Availability Connectors

Deploy multiple connectors for redundancy:

```yaml
# ha-connector.yaml
apiVersion: fabedge.io/v1alpha1
kind: Community
metadata:
  name: retail-stores-ha
spec:
  members:
  - name: edge-cluster-01
    role: connector
    connectors:
    - endpoint: 192.168.1.10:500
    - endpoint: 192.168.1.11:500  # Backup connector
  - name: edge-cluster-02
    role: connector
    connectors:
    - endpoint: 192.168.2.10:500
    - endpoint: 192.168.2.11:500
```

## Monitoring FabEdge Networking

Track FabEdge metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fabedge-metrics
  namespace: fabedge
spec:
  selector:
    matchLabels:
      app: fabedge-agent
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics:

- Tunnel status and packet counts
- Cross-cluster latency
- Connection failures
- Service export status

## Optimizing for Bandwidth-Constrained Links

Configure compression for slow links:

```yaml
# fabedge-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fabedge-config
  namespace: fabedge
data:
  enable-compression: "true"
  compression-level: "6"  # 1-9, higher = more compression
  mtu: "1400"  # Account for tunnel overhead
```

## Implementing Traffic Prioritization

Prioritize critical traffic between edges:

```yaml
# priority-policy.yaml
apiVersion: fabedge.io/v1alpha1
kind: TrafficPolicy
metadata:
  name: prioritize-control
  namespace: fabedge
spec:
  selector:
    matchLabels:
      type: control-plane
  priority: high
  bandwidth:
    min: 10Mbps
    max: 100Mbps
```

## Handling NAT Traversal

For clusters behind NAT, configure STUN servers:

```yaml
spec:
  connector:
    stunServers:
    - stun:stun.l.google.com:19302
    - stun:stun1.l.google.com:19302
  nat:
    enabled: true
    strategy: udp-hole-punching
```

## Creating Disaster Recovery Patterns

Implement failover between edge sites:

```yaml
# dr-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: critical
  template:
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: fabedge.io/cluster
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical
```

This spreads replicas across edge clusters for resilience.

## Troubleshooting Connectivity Issues

Debug FabEdge connections:

```bash
# Check connector status
kubectl get connectors -n fabedge

# View agent logs
kubectl logs -n fabedge -l app=fabedge-agent

# Test tunnel
kubectl exec -n fabedge fabedge-agent-xxx -- ping <remote-pod-ip>

# Check routing table
kubectl exec -n fabedge fabedge-agent-xxx -- ip route
```

## Implementing Bandwidth Shaping

Limit bandwidth between specific clusters:

```yaml
apiVersion: fabedge.io/v1alpha1
kind: BandwidthPolicy
metadata:
  name: limit-test-traffic
spec:
  from: edge-cluster-01
  to: edge-cluster-02
  maxBandwidth: 50Mbps
  priority: low
```

## Conclusion

FabEdge enables efficient edge-to-edge networking for distributed Kubernetes deployments, eliminating unnecessary cloud hairpins and reducing latency. By providing direct pod-to-pod communication across clusters, FabEdge makes truly distributed edge applications practical and performant.

Start with two edge clusters to validate connectivity and failover behavior, monitor network patterns carefully, then expand to your full edge topology. The direct networking model unlocks new application architectures that weren't practical with traditional cloud-centric approaches.
