# Deploy FabEdge for Edge-to-Edge Container Networking Across Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, Networking

Description: Learn how to deploy FabEdge to enable direct pod-to-pod communication between edge Kubernetes clusters without hairpin routing through the cloud.

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

- Kubernetes clusters running supported networking, such as Flannel or Calico
- Edge nodes or edge clusters managed with a supported edge framework when applicable
- One central cloud cluster (for control plane)
- Network connectivity between sites (can be indirect)
- Helm 3.x installed

## Installing FabEdge on the Host Cluster

On your host cluster, install FabEdge with the published Helm chart:

```bash
# Add FabEdge Helm repository
helm repo add fabedge https://fabedge.github.io/helm-chart
helm repo update

# Install FabEdge on the host cluster
curl https://fabedge.github.io/helm-chart/scripts/quickstart.sh | bash -s -- \
  --cluster-name cloud \
  --cluster-role host \
  --cluster-zone central \
  --cluster-region us \
  --connectors cloud-node-01 \
  --connector-public-addresses <cloud-connector-ip> \
  --chart fabedge/fabedge
```

Verify installation:

```bash
kubectl get pods -n fabedge
```

## Deploying FabEdge on Edge Clusters

Register each edge cluster on the host cluster and use the registration token when installing FabEdge in that member cluster:

```bash
# Run on the host cluster
cat > edge-cluster-01.yaml <<EOF
apiVersion: fabedge.io/v1alpha1
kind: Cluster
metadata:
  name: edge-cluster-01
EOF
kubectl apply -f edge-cluster-01.yaml
INIT_TOKEN=$(kubectl get cluster edge-cluster-01 -o go-template --template='{{.spec.token}}' | awk 'END{print}')

# Run on edge-cluster-01
curl https://fabedge.github.io/helm-chart/scripts/quickstart.sh | bash -s -- \
  --cluster-name edge-cluster-01 \
  --cluster-role member \
  --cluster-zone edge-01 \
  --cluster-region us \
  --connectors edge-node-01 \
  --connector-public-addresses <edge-connector-ip> \
  --operator-api-server https://<cloud-connector-ip>:30303 \
  --service-hub-api-server https://<cloud-connector-ip>:30000 \
  --init-token "$INIT_TOKEN" \
  --chart fabedge/fabedge
```

Repeat for each edge cluster with unique cluster names and non-overlapping CIDRs.

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
spec:
  members:
  - cloud.connector
  - edge-cluster-01.connector
  - edge-cluster-02.connector
  - edge-cluster-03.connector
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
  labels:
    fabedge.io/global-service: "true"
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
curl http://api-service.default.svc.global:8080
```

FabEdge creates global service DNS entries when FabDNS is enabled and CoreDNS forwards the `global` zone to it.

## Configuring Network Policies

Control cross-cluster traffic with NetworkPolicies in the destination cluster. Use a CNI that enforces NetworkPolicy and match the remote cluster's pod CIDR:

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
    - ipBlock:
        cidr: 10.43.0.0/16
    - ipBlock:
        cidr: 10.44.0.0/16
    ports:
    - protocol: TCP
      port: 8080
```

## Implementing High-Availability Connectors

Deploy multiple connectors for redundancy with connector replicas and keepalived:

```yaml
# values-ha.yaml
cluster:
  name: cloud
  role: host
  region: us
  zone: central
  cniType: flannel
  connectorPublicAddresses:
  - 203.0.113.10
  connectorPublicPort: 45000
  connectorAsMediator: true

connector:
  replicas: 2

keepalived:
  create: true
  vip: 192.168.1.200
  interface: eth0
  routerID: 51
```

## Monitoring FabEdge Networking

Track FabEdge status with Kubernetes resources and StrongSwan tunnel state:

```bash
kubectl get pods -n fabedge -o wide
kubectl get communities.fabedge.io
kubectl exec -n fabedge fabedge-agent-xxx -c strongswan -- swanctl --list-sas
```

Key checks:

- Tunnel status and packet counts
- Cross-cluster latency
- Connection failures
- Service export status

## Optimizing for Bandwidth-Constrained Links

Tune FabEdge agent behavior for constrained links with supported Helm values, such as disabling optional proxy and DNS helpers when they are not needed:

```yaml
# values-constrained-link.yaml
agent:
  args:
    ENABLE_PROXY: "false"
    ENABLE_DNS: "false"
    MASQ_OUTGOING: "true"
```

## Implementing Traffic Prioritization

Prioritize critical traffic between edges with Kubernetes scheduling and application-level QoS. FabEdge does not define a TrafficPolicy CRD:

```yaml
# priority-policy.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: prioritize-control
value: 100000
globalDefault: false
description: "Priority for latency-sensitive control traffic workloads."
```

## Handling NAT Traversal

For clusters behind NAT, use the connector as a mediator for hole punching and expose the connector public address and port:

```yaml
cluster:
  connectorPublicAddresses:
  - <connector-public-ip>
  connectorPublicPort: 45000
  connectorAsMediator: true
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
    metadata:
      labels:
        app: critical
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical
      containers:
      - name: critical-app
        image: nginx:1.27
```

This spreads replicas across topology domains when nodes are labeled with that topology key.

## Troubleshooting Connectivity Issues

Debug FabEdge connections:

```bash
# Check connector status
kubectl get pods -n fabedge -l app=fabedge-connector

# View agent logs
kubectl logs -n fabedge -l app=fabedge-agent

# Test tunnel
kubectl exec -n fabedge fabedge-agent-xxx -c strongswan -- swanctl --list-sas

# Check routing table
kubectl exec -n fabedge fabedge-agent-xxx -- ip route
```

## Implementing Bandwidth Shaping

Limit bandwidth between specific clusters outside FabEdge, for example with Linux traffic control on connector nodes. FabEdge does not define a BandwidthPolicy CRD:

```bash
tc qdisc add dev eth0 root tbf rate 50mbit burst 32kbit latency 400ms
```

## Conclusion

FabEdge enables efficient edge-to-edge networking for distributed Kubernetes deployments, eliminating unnecessary cloud hairpins and reducing latency. By providing direct pod-to-pod communication across clusters, FabEdge makes truly distributed edge applications practical and performant.

Start with two edge clusters to validate connectivity and failover behavior, monitor network patterns carefully, then expand to your full edge topology. The direct networking model unlocks new application architectures that weren't practical with traditional cloud-centric approaches.
