# How to Set Up Cross-Zone High Availability for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, High Availability, Cross-Zone, Kubernetes, Infrastructure, Disaster Recovery

Description: Configure cross-zone high availability for your Talos Linux cluster to survive zone-level failures in cloud and on-premise environments.

---

Single-zone Kubernetes clusters have a fundamental weakness: if the entire zone goes down, whether due to a power outage, network partition, or cloud provider issue, your whole cluster is unreachable. Cross-zone high availability distributes your Talos Linux cluster across multiple availability zones or physical locations so that the failure of any single zone does not take down your services. This is a critical requirement for applications with strict uptime SLAs.

This guide covers designing and implementing cross-zone HA for Talos Linux, including control plane distribution, etcd topology, storage considerations, and workload scheduling across zones.

## Architecture Design

A cross-zone HA Talos Linux cluster distributes nodes across three zones:

```text
Zone A (192.168.1.0/24):
  - cp-1 (control plane)
  - worker-a1, worker-a2

Zone B (192.168.2.0/24):
  - cp-2 (control plane)
  - worker-b1, worker-b2

Zone C (192.168.3.0/24):
  - cp-3 (control plane)
  - worker-c1, worker-c2

Load Balancer / VIP: Accessible from all zones
```

Each zone has one control plane node and multiple workers. This way, losing any single zone still leaves two control plane nodes available for etcd quorum.

## Network Requirements

Cross-zone setups require reliable network connectivity between zones. The key requirements are:

- **Low latency** between zones (ideally under 10ms round-trip for etcd)
- **Sufficient bandwidth** for etcd replication and pod-to-pod traffic
- **Routable IPs** across all zones

For on-premise setups, this usually means VLAN trunking or dedicated inter-zone links. For cloud deployments, availability zones within the same region typically meet these requirements.

## Configuring Node Labels for Zones

Label your nodes so Kubernetes and your applications know which zone each node is in:

```yaml
# Zone labels in Talos machine config for Zone A nodes
machine:
  nodeLabels:
    topology.kubernetes.io/zone: zone-a
    topology.kubernetes.io/region: us-east
    failure-domain.beta.kubernetes.io/zone: zone-a
```

Apply zone-specific patches to each group of nodes:

```yaml
# zone-a-patch.yaml
machine:
  nodeLabels:
    topology.kubernetes.io/zone: zone-a
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
          - network: 192.168.2.0/24
            gateway: 192.168.1.1
          - network: 192.168.3.0/24
            gateway: 192.168.1.1
```

```yaml
# zone-b-patch.yaml
machine:
  nodeLabels:
    topology.kubernetes.io/zone: zone-b
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.2.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.2.1
```

## etcd Topology Configuration

etcd needs to be aware of zone topology for optimal leader election and data distribution. Configure the etcd members to advertise their zone:

```yaml
# controlplane-zone-a-patch.yaml
cluster:
  etcd:
    advertisedSubnets:
      - 192.168.1.0/24
      - 192.168.2.0/24
      - 192.168.3.0/24
    extraArgs:
      initial-cluster-state: new
      # Longer timeouts for cross-zone latency
      election-timeout: "10000"
      heartbeat-interval: "1000"
```

The increased election timeout (10 seconds) and heartbeat interval (1 second) account for the higher latency between zones. In a single-zone cluster, the defaults of 1000ms and 100ms are fine, but cross-zone networks introduce additional latency that can cause unnecessary leader elections.

## Load Balancing Across Zones

For the Kubernetes API endpoint, you need a load balancer that is accessible from all zones. Options include:

### DNS-Based Load Balancing

```bash
# Create DNS records pointing to all control plane nodes
api.cluster.example.com -> 192.168.1.10 (Zone A)
api.cluster.example.com -> 192.168.2.11 (Zone B)
api.cluster.example.com -> 192.168.3.12 (Zone C)
```

Use this DNS name as the cluster endpoint:

```bash
talosctl gen config my-cluster https://api.cluster.example.com:6443
```

### Cloud Load Balancer

In cloud environments, use a cross-zone load balancer service:

```bash
# AWS example: Create an NLB across availability zones
aws elbv2 create-load-balancer \
  --name talos-api-lb \
  --type network \
  --subnets subnet-zone-a subnet-zone-b subnet-zone-c
```

## Zone-Aware Workload Scheduling

Use pod topology spread constraints to distribute workloads across zones:

```yaml
# zone-spread-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
      containers:
        - name: web-app
          image: nginx:latest
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

This ensures pods are distributed evenly across zones. With 6 replicas and 3 zones, each zone gets 2 replicas.

## Cross-Zone Storage

Storage is the trickiest part of cross-zone HA. Options include:

### Replicated Block Storage (Longhorn)

Longhorn can replicate volumes across zones:

```yaml
# longhorn-cross-zone-sc.yaml
apiVersion: storage.longhorn.io/v1beta2
kind: StorageClass
metadata:
  name: longhorn-cross-zone
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  dataLocality: disabled
  replicaAutoBalance: best-effort
  # Distribute replicas across zones
  diskSelector: ""
  nodeSelector: ""
```

Configure Longhorn node tags for zone awareness:

```bash
# Tag Longhorn nodes with their zone
kubectl -n longhorn-system patch nodes.longhorn.io worker-a1 \
  --type=merge -p '{"spec":{"tags":["zone-a"]}}'
kubectl -n longhorn-system patch nodes.longhorn.io worker-b1 \
  --type=merge -p '{"spec":{"tags":["zone-b"]}}'
kubectl -n longhorn-system patch nodes.longhorn.io worker-c1 \
  --type=merge -p '{"spec":{"tags":["zone-c"]}}'
```

### Zone-Aware StatefulSets

For databases that manage their own replication (like PostgreSQL with Patroni), use zone-aware scheduling:

```yaml
# postgres-ha-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: postgres
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: postgres
              topologyKey: kubernetes.io/hostname
      containers:
        - name: postgres
          image: postgres:15
```

## Testing Cross-Zone Failover

Simulate a zone failure by cordoning all nodes in one zone:

```bash
# Simulate Zone A failure
kubectl cordon worker-a1
kubectl cordon worker-a2
kubectl cordon cp-1

# Verify workloads redistribute
kubectl get pods -o wide

# Check that the cluster is still operational
kubectl get nodes
talosctl etcd members --nodes 192.168.2.11

# Restore Zone A
kubectl uncordon worker-a1
kubectl uncordon worker-a2
kubectl uncordon cp-1
```

## Network Policies for Cross-Zone Traffic

If zones have different network segments, ensure your CNI allows cross-zone traffic:

```yaml
# allow-cross-zone-traffic.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-cross-zone
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - ipBlock:
            cidr: 192.168.0.0/16
  egress:
    - to:
        - ipBlock:
            cidr: 192.168.0.0/16
```

## Monitoring Zone Health

Track per-zone health metrics:

```yaml
# zone-health-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: zone-health
spec:
  groups:
    - name: zone-availability
      rules:
        - alert: ZoneNodesDown
          expr: |
            count by (zone) (
              kube_node_status_condition{condition="Ready",status="true"} == 1
            ) < 1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "No healthy nodes in zone {{ $labels.zone }}"
        - alert: ZoneImbalance
          expr: |
            max(count by (zone) (kube_node_info)) -
            min(count by (zone) (kube_node_info)) > 2
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node count imbalance across zones"
```

## Conclusion

Cross-zone high availability for Talos Linux protects your cluster against zone-level failures, which are far more common than individual node failures. By distributing control plane nodes and workers across three zones, using topology spread constraints for workload distribution, and configuring cross-zone storage replication, you build a cluster that maintains availability even when an entire zone goes offline. The upfront investment in cross-zone design pays off every time a zone experiences issues, keeping your services running while you address the underlying problem.
