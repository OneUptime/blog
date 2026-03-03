# How to Configure Internal Load Balancing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Internal Load Balancing, Kubernetes, kube-proxy, IPVS, Service

Description: Configure and optimize internal load balancing on Talos Linux for efficient service-to-service communication within your Kubernetes cluster.

---

Internal load balancing in Kubernetes is what makes service-to-service communication work. When one pod talks to another through a Service, kube-proxy (or its replacement) distributes traffic across all the backend pods. On Talos Linux, you have several options for how this works under the hood, and the choice affects performance, scalability, and observability. This guide covers the internal load balancing mechanisms available on Talos Linux and how to configure them for your needs.

## How Internal Load Balancing Works

Every Kubernetes Service gets a virtual IP (ClusterIP). When a pod connects to that IP, the connection needs to be routed to one of the actual backend pods. This translation happens at the node level, and there are three main approaches:

1. iptables mode (default) - uses iptables rules for NAT
2. IPVS mode - uses Linux IPVS (IP Virtual Server) kernel module
3. eBPF mode - used by CNIs like Cilium to replace kube-proxy entirely

Each has trade-offs in terms of performance, features, and complexity.

## kube-proxy in iptables Mode

The default mode on most Kubernetes clusters, including Talos Linux. kube-proxy creates iptables rules that perform DNAT (Destination NAT) to translate the ClusterIP to a pod IP.

Check your current mode:

```bash
# Check kube-proxy configuration
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode

# An empty mode field means iptables (the default)
```

iptables mode is fine for small to medium clusters. However, with thousands of services, the number of iptables rules grows linearly, and rule evaluation becomes a bottleneck.

To explicitly configure iptables mode in Talos:

```yaml
# talos machine config
cluster:
  proxy:
    mode: iptables
```

## Switching to IPVS Mode

IPVS is built into the Linux kernel and is specifically designed for load balancing. It uses hash tables instead of linear iptables chains, which means performance stays consistent regardless of how many services you have.

Configure Talos to use IPVS mode:

```yaml
# talos-ipvs-patch.yaml
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: rr  # Round-robin scheduling
```

Apply to all nodes:

```bash
talosctl patch machineconfig --nodes $ALL_NODES --patch-file talos-ipvs-patch.yaml
```

Verify IPVS is active:

```bash
# Check that IPVS rules are being created
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=kube-proxy -o jsonpath='{.items[0].metadata.name}') -- ipvsadm -L -n

# Or from talosctl
talosctl dmesg --nodes $NODE_IP | grep IPVS
```

## IPVS Scheduling Algorithms

IPVS supports several load balancing algorithms:

```yaml
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      # Round Robin - equal distribution (default)
      ipvs-scheduler: rr

      # Least Connection - sends to pod with fewest active connections
      # ipvs-scheduler: lc

      # Source Hashing - same source IP always goes to same backend
      # ipvs-scheduler: sh

      # Weighted Round Robin - accounts for pod weight
      # ipvs-scheduler: wrr
```

For most workloads, `rr` (round-robin) works well. Use `lc` (least connections) when your backend pods have varying processing times, as it naturally routes traffic away from busy pods.

## Session Affinity

For applications that need requests from the same client to reach the same pod, configure session affinity:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # Session stickiness duration
```

With session affinity, the load balancer routes all requests from the same client IP to the same backend pod for the specified duration.

## Topology-Aware Routing

Kubernetes supports topology-aware routing (formerly Topology Aware Hints) to keep traffic within the same zone or node when possible. This reduces cross-node traffic and latency:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

For this to work, your nodes need topology labels:

```bash
# Check if nodes have topology labels
kubectl get nodes --show-labels | grep topology

# On Talos Linux, you may need to add these labels
kubectl label node worker-1 topology.kubernetes.io/zone=rack-a
kubectl label node worker-2 topology.kubernetes.io/zone=rack-a
kubectl label node worker-3 topology.kubernetes.io/zone=rack-b
```

## Internal Traffic Policy

Starting with Kubernetes 1.26, you can configure a service to only route to pods on the same node using `internalTrafficPolicy`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: node-local-service
spec:
  selector:
    app: my-agent
  ports:
  - port: 80
    targetPort: 8080
  internalTrafficPolicy: Local  # Only route to pods on the same node
```

This is useful for DaemonSets where each node runs a copy of the service and you want local traffic to stay local.

## Using Cilium as kube-proxy Replacement

Cilium can replace kube-proxy entirely with eBPF-based load balancing, which is faster than both iptables and IPVS:

```yaml
# Talos machine config to disable kube-proxy
cluster:
  proxy:
    disabled: true
```

Then install Cilium with kube-proxy replacement:

```bash
helm install cilium cilium/cilium \
    --namespace kube-system \
    --set kubeProxyReplacement=true \
    --set k8sServiceHost=$API_SERVER_IP \
    --set k8sServicePort=6443 \
    --set operator.replicas=1
```

With Cilium's eBPF load balancing:

```bash
# Check Cilium's service proxy status
cilium status

# View the eBPF service map
cilium service list

# Check load balancing decisions
cilium bpf lb list
```

## Monitoring Internal Load Balancing

Track how your internal load balancing is performing:

```bash
# kube-proxy metrics
kubectl port-forward -n kube-system $(kubectl get pod -n kube-system -l k8s-app=kube-proxy -o jsonpath='{.items[0].metadata.name}') 10249:10249 &

# Check sync latency
curl -s http://localhost:10249/metrics | grep kubeproxy_sync_proxy_rules_duration_seconds

# Check number of services being load balanced
curl -s http://localhost:10249/metrics | grep kubeproxy_sync_proxy_rules_service_changes_total
```

Set up alerts for load balancing issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kube-proxy-alerts
  namespace: monitoring
spec:
  groups:
  - name: kube-proxy
    rules:
    - alert: KubeProxySyncSlow
      expr: |
        histogram_quantile(0.99, rate(kubeproxy_sync_proxy_rules_duration_seconds_bucket[5m])) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "kube-proxy rule sync is taking over 1 second"

    - alert: KubeProxyEndpointSlicesNotSyncing
      expr: |
        rate(kubeproxy_sync_proxy_rules_endpoint_changes_total[5m]) == 0 and kubeproxy_sync_proxy_rules_last_timestamp_seconds > 0
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "kube-proxy has not synced endpoint changes"
```

## Service Mesh for Advanced Load Balancing

For more sophisticated internal load balancing, consider a service mesh like Istio or Linkerd:

```yaml
# Istio DestinationRule for advanced load balancing
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST  # Route to least busy backend
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Benchmarking Internal Load Balancing

Test the performance of your load balancing configuration:

```bash
# Deploy a benchmark tool
kubectl run bench --rm -it --restart=Never --image=williamyeh/wrk -- \
    wrk -t4 -c100 -d30s http://my-app.production.svc.cluster.local:80/

# Compare response time distribution
kubectl run bench --rm -it --restart=Never --image=curlimages/curl -- \
    sh -c 'for i in $(seq 1 50); do
        curl -s -w "%{time_total}\n" -o /dev/null http://my-app.production:80/
    done | sort -n'
```

## Wrapping Up

Internal load balancing on Talos Linux has sensible defaults that work for most clusters. Start with the default iptables mode, and switch to IPVS when you hit scale (hundreds of services) or need specific scheduling algorithms. For maximum performance, Cilium's eBPF replacement eliminates kube-proxy overhead entirely. Regardless of which mode you use, topology-aware routing and internal traffic policies let you optimize traffic flow to minimize latency and cross-node hops.
