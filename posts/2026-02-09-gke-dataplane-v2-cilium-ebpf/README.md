# How to Enable GKE Dataplane V2 with Cilium for eBPF-Based Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, GKE, Cilium, eBPF, Networking

Description: Learn how to enable and configure GKE Dataplane V2 with Cilium for high-performance eBPF-based networking, network policies, and observability in Google Kubernetes Engine.

---

GKE Dataplane V2 replaces the traditional iptables-based networking with a Google-managed dataplane implemented using Cilium and eBPF. This architecture provides better scalability and observability compared to the default kube-proxy implementation. eBPF programs run directly in the Linux kernel, reducing context switches and improving packet processing efficiency.

## Understanding Dataplane V2 Architecture

Traditional Kubernetes networking uses iptables rules for service load balancing and network policies. As clusters grow, iptables performance degrades because it evaluates rules sequentially. A cluster with thousands of services can have tens of thousands of iptables rules, causing significant latency.

Dataplane V2 uses Cilium with eBPF programs that process packets in kernel space. eBPF provides programmable packet filtering and forwarding without the overhead of iptables. It uses efficient hash tables instead of sequential rule evaluation, maintaining consistent performance regardless of cluster size.

Cilium in GKE handles pod networking, service load balancing, network policies, and observability through the GKE-managed `anetd` DaemonSet. It replaces kube-proxy for Kubernetes Services on Linux node pools, using eBPF programs attached to network interfaces for service traffic routing.

## Creating Clusters with Dataplane V2

Dataplane V2 must be enabled at cluster creation. It cannot be enabled on existing clusters:

```bash
# Create new cluster with Dataplane V2

gcloud container clusters create production-cluster \
  --enable-dataplane-v2 \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork my-subnet

# Verify Dataplane V2 is enabled
gcloud container clusters describe production-cluster \
  --region us-central1 \
  --format="value(networkConfig.datapathProvider)"
```

The output should show ADVANCED_DATAPATH, indicating Dataplane V2 is active.

For production clusters, combine Dataplane V2 with other features:

```bash
gcloud container clusters create production-cluster \
  --enable-dataplane-v2 \
  --enable-ip-alias \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --region us-central1 \
  --machine-type n2-standard-4 \
  --disk-type pd-ssd \
  --disk-size 100
```

## Verifying Cilium Installation

After cluster creation, verify Cilium pods are running:

```bash
# Check Cilium pods
kubectl get pods -n kube-system -l k8s-app=cilium

# Verify Cilium agent status
kubectl exec -n kube-system -it anetd-xxxxx -- cilium status

# Check eBPF maps
kubectl exec -n kube-system -it anetd-xxxxx -- cilium bpf lb list
```

Cilium status output shows the configuration, including enabled features, kube-proxy replacement status, and connected nodes.

View service load balancing entries:

```bash
# Check service load balancing entries
kubectl exec -n kube-system anetd-xxxxx -- cilium service list
```

## Implementing Network Policies with Cilium

Dataplane V2 supports standard Kubernetes NetworkPolicy resources. GKE versions 1.21.5-gke.1300 and later do not support the CiliumNetworkPolicy or CiliumClusterwideNetworkPolicy CRD APIs, so use Kubernetes NetworkPolicy for Pod-to-Pod rules and GKE FQDNNetworkPolicy for DNS-based egress rules.

Create a basic Kubernetes NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

GKE Dataplane V2 converts these policies to efficient eBPF programs:

```bash
kubectl apply -f network-policy.yaml

# Verify policy is applied
kubectl exec -n kube-system anetd-xxxxx -- cilium policy get
```

Use GKE FQDNNetworkPolicy for DNS-based egress rules:

```yaml
apiVersion: networking.gke.io/v1alpha1
kind: FQDNNetworkPolicy
metadata:
  name: allow-googleapis
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  egress:
  - matches:
    - pattern: "*.googleapis.com"
    ports:
    - protocol: TCP
      port: 443
```

This policy allows selected web pods to communicate with matching Google APIs on TCP port 443. Use a separate Kubernetes NetworkPolicy for in-cluster Pod-to-Pod traffic.

## Configuring DNS-Based Egress Policies

FQDN network policies require GKE Dataplane V2 and must be enabled on the cluster. They cannot be enabled on the same cluster as inter-node transparent encryption:

```bash
gcloud container clusters update production-cluster \
  --enable-fqdn-network-policy \
  --location us-central1

kubectl rollout restart ds -n kube-system anetd
```

Create a DNS-based policy for HTTPS access:

```yaml
apiVersion: networking.gke.io/v1alpha1
kind: FQDNNetworkPolicy
metadata:
  name: googleapis-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  egress:
  - matches:
    - pattern: "*.googleapis.com"
    ports:
    - port: 443
      protocol: TCP
```

This policy allows frontend pods to access Google APIs over HTTPS.

Test the policy:

```bash
# Allowed request
kubectl exec -n production frontend-pod -- curl https://storage.googleapis.com

# Blocked request when no other egress policy allows it
kubectl exec -n production frontend-pod -- curl https://example.com

# Check policy violations
kubectl exec -n kube-system anetd-xxxxx -- cilium monitor --type drop
```

## Monitoring with Hubble

Hubble provides observability into network traffic and policy decisions. GKE Dataplane V2 observability tools are disabled by default and can be enabled on a GKE Dataplane V2 cluster:

```bash
# Enable GKE Dataplane V2 flow observability
gcloud container clusters update production-cluster \
  --enable-dataplane-v2-flow-observability \
  --location us-central1

# Use the managed Hubble CLI container
alias hubble="kubectl exec -it -n gke-managed-dpv2-observability deployment/hubble-relay -c hubble-cli -- hubble"
```

Use Hubble CLI for network flow inspection:

```bash
# Query network flows
hubble observe

# Filter by namespace
hubble observe --namespace production

# Show only dropped packets
hubble observe --verdict DROPPED
```

Monitor specific pods:

```bash
# Watch traffic for a specific pod
hubble observe --pod production/frontend-xxxxx

# Show HTTP flows only
hubble observe --protocol http
```

## Optimizing Service Load Balancing

Dataplane V2 uses eBPF for service load balancing instead of kube-proxy on Linux node pools:

```bash
# Check service load balancing mode
kubectl exec -n kube-system anetd-xxxxx -- cilium config view | grep bpf-lb

# View service backend mapping
kubectl exec -n kube-system anetd-xxxxx -- cilium service list
```

Create a service to test load balancing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
  externalTrafficPolicy: Local
```

Setting externalTrafficPolicy to Local preserves the client source IP and routes external traffic only to nodes with local ready endpoints.

## Implementing Network Encryption

GKE supports inter-node transparent encryption using WireGuard on GKE Dataplane V2 clusters. Encryption is configured at the cluster level:

```bash
# Create cluster with inter-node transparent encryption
gcloud container clusters create secure-cluster \
  --enable-dataplane-v2 \
  --in-transit-encryption inter-node-transparent \
  --location us-central1 \
  --machine-type n2-standard-4
```

Verify encryption status:

```bash
# Check if encryption is active
kubectl exec -n kube-system anetd-xxxxx -- cilium status | grep Encryption
```

Test encrypted communication:

```bash
# Deploy test pods in different nodes
kubectl run client --image=nicolaka/netshoot -- sleep infinity
kubectl run server --image=nginx

# Confirm WireGuard peers
kubectl exec -n kube-system anetd-xxxxx -- cilium status | grep Encryption
```

## Troubleshooting Connectivity Issues

When pods cannot communicate, use Cilium debugging tools:

```bash
# Check endpoint status
kubectl exec -n kube-system anetd-xxxxx -- cilium endpoint list

# Get details for specific endpoint
kubectl exec -n kube-system anetd-xxxxx -- cilium endpoint get <endpoint-id>

# Verify network policies
kubectl exec -n kube-system anetd-xxxxx -- cilium policy get

# Check anetd logs in Cloud Logging when service or policy enforcement fails
gcloud logging read 'resource.type="k8s_container" AND labels."k8s-pod/k8s-app"="cilium"' \
  --limit 20
```

Monitor real-time policy verdicts:

```bash
# Watch policy decisions
kubectl exec -n kube-system anetd-xxxxx -- cilium monitor --type policy-verdict

# Debug specific pod connectivity
kubectl exec -n kube-system anetd-xxxxx -- cilium endpoint log <endpoint-id>
```

## Performance Comparison

Benchmark eBPF vs iptables performance in your cluster:

```bash
# Deploy a simple iperf3 server and client
kubectl create deployment iperf-server --image=networkstatic/iperf3 -- iperf3 -s
kubectl expose deployment iperf-server --port 5201
kubectl run iperf-client --rm -it --image=networkstatic/iperf3 --restart=Never -- \
  iperf3 -c iperf-server -p 5201
```

eBPF-based networking removes several iptables-related scaling bottlenecks, especially in clusters with many Services. Actual throughput and latency improvements depend on workload, node type, cluster size, and traffic pattern.

## Migrating from Standard to Dataplane V2

Since Dataplane V2 cannot be enabled on existing clusters, migration requires creating a new cluster:

```bash
# Create new cluster with Dataplane V2
gcloud container clusters create new-production-cluster \
  --enable-dataplane-v2 \
  --region us-central1 \
  --machine-type n2-standard-4

# Update kubeconfig
gcloud container clusters get-credentials new-production-cluster --region us-central1

# Migrate workloads using Velero or manual redeployment
velero backup create old-cluster-backup --include-namespaces production

# Restore to new cluster
velero restore create --from-backup old-cluster-backup
```

Test thoroughly before switching traffic to the new cluster.

GKE Dataplane V2 with Cilium provides modern, high-performance networking for Kubernetes clusters. The eBPF-based architecture delivers better scalability, advanced policy capabilities, and comprehensive observability compared to traditional networking implementations.
