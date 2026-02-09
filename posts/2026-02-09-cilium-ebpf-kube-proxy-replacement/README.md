# How to Configure Cilium eBPF-Based kube-proxy Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, eBPF

Description: Replace kube-proxy with Cilium's eBPF-based implementation to reduce latency, improve throughput, and eliminate iptables complexity in your Kubernetes cluster with practical configuration steps and performance validation.

---

The traditional kube-proxy component in Kubernetes uses iptables or IPVS to handle service load balancing. While functional, these approaches introduce latency and create complex iptables chains that become difficult to debug at scale. Cilium offers an eBPF-based kube-proxy replacement that eliminates these issues entirely. This guide shows you how to implement it.

## Why Replace kube-proxy

Before diving into configuration, you should understand why replacing kube-proxy matters. The standard kube-proxy implementation creates iptables rules for every service and endpoint in your cluster. On a cluster with 1,000 services and 5,000 endpoints, you end up with tens of thousands of iptables rules.

Each packet traverses these rules sequentially until it finds a match. This creates O(n) lookup performance that degrades as your cluster grows. You'll notice increased latency and CPU usage as your cluster scales.

Cilium's eBPF implementation uses hash tables for O(1) lookups and processes packets directly in the kernel without the iptables overhead. You get consistent performance regardless of cluster size.

The eBPF datapath also enables advanced features like direct server return (DSR), which allows response traffic to bypass load balancing hops and return directly to clients. This cuts latency in half for many workloads.

## Prerequisites and Cluster Preparation

You need a Kubernetes cluster running version 1.24 or later with a kernel version of 4.9.17 or higher. Most modern Linux distributions meet this requirement. Check your kernel version:

```bash
# Check kernel version on all nodes
kubectl get nodes -o wide

# Or SSH to a node and check directly
uname -r
```

If you're building a new cluster, disable kube-proxy from the start. For kubeadm clusters:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
skipPhases:
  - addon/kube-proxy  # Skip kube-proxy installation
```

Initialize your cluster with this configuration:

```bash
sudo kubeadm init --config kubeadm-config.yaml
```

For managed Kubernetes services, you typically can't disable kube-proxy during cluster creation. You'll need to remove it after installing Cilium.

## Installing Cilium with kube-proxy Replacement

Use Helm to install Cilium with kube-proxy replacement enabled. First, add the Cilium Helm repository:

```bash
helm repo add cilium https://helm.cilium.io/
helm repo update
```

Install Cilium with kube-proxy replacement enabled:

```bash
helm install cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=API_SERVER_IP \
  --set k8sServicePort=API_SERVER_PORT \
  --set hostServices.enabled=true \
  --set externalIPs.enabled=true \
  --set nodePort.enabled=true \
  --set hostPort.enabled=true \
  --set bpf.masquerade=true \
  --set image.pullPolicy=IfNotPresent
```

Replace `API_SERVER_IP` and `API_SERVER_PORT` with your cluster's API server endpoint. You can find these values with:

```bash
kubectl cluster-info | grep 'Kubernetes control plane'
```

The installation takes a few minutes as Cilium rolls out across all nodes. Monitor the installation:

```bash
kubectl -n kube-system rollout status ds/cilium
```

## Removing Existing kube-proxy

If you installed Cilium on a cluster that already has kube-proxy running, you need to remove it. First, verify Cilium is healthy:

```bash
cilium status --wait
```

Once Cilium reports healthy, delete the kube-proxy DaemonSet:

```bash
# Delete kube-proxy DaemonSet
kubectl -n kube-system delete ds kube-proxy

# Delete kube-proxy ConfigMap (optional, prevents accidental reinstall)
kubectl -n kube-system delete cm kube-proxy

# Clean up kube-proxy iptables rules on each node
kubectl -n kube-system exec ds/cilium -- cilium cleanup
```

For a more thorough cleanup, SSH to each node and remove iptables rules manually:

```bash
# On each node
iptables-save | grep -v KUBE | iptables-restore
```

## Verifying the Replacement

Verify that Cilium has successfully replaced kube-proxy functionality. Run the connectivity test:

```bash
cilium connectivity test
```

This creates test pods and services to validate that all networking features work correctly. The test covers:

- Pod-to-pod connectivity
- Pod-to-service connectivity
- Service load balancing
- NodePort services
- External IPs
- Health checks

You should see all tests pass. Check the Cilium status to confirm kube-proxy replacement is active:

```bash
cilium status | grep KubeProxyReplacement
```

You'll see output like:

```
KubeProxyReplacement:    True   [eth0 10.0.1.5 (Direct Routing)]
```

## Enabling Advanced Features

With kube-proxy replacement active, you can enable additional performance optimizations. Direct Server Return (DSR) mode allows response traffic to bypass the load balancer:

```bash
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values \
  --set loadBalancer.mode=dsr
```

DSR mode requires that your external load balancer supports it. It works best with MetalLB or cloud provider load balancers that support DSR.

Enable Maglev consistent hashing for better load distribution:

```bash
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values \
  --set loadBalancer.algorithm=maglev \
  --set maglev.tableSize=65521
```

Maglev hashing ensures that backend changes cause minimal connection disruption by maintaining consistent hash values.

## Testing Service Load Balancing

Create a test deployment and service to validate load balancing:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30080
```

Deploy the resources:

```bash
kubectl apply -f test-deployment.yaml
```

Test load balancing by making requests and checking which pods handle them:

```bash
# Add unique identifiers to each pod
for pod in $(kubectl get pods -l app=nginx -o name); do
  kubectl exec $pod -- sh -c 'echo $HOSTNAME > /usr/share/nginx/html/index.html'
done

# Make multiple requests to see load distribution
for i in {1..10}; do
  curl http://NODE_IP:30080
done
```

You should see requests distributed across all three pods.

## Performance Validation

Measure the performance improvement over traditional kube-proxy. Use the netperf latency test:

```bash
# Deploy netperf server behind a service
kubectl create deployment netperf-server --image=networkstatic/netperf --replicas=3 -- netserver -D
kubectl expose deployment netperf-server --port=12865 --target-port=12865

# Deploy client
kubectl run netperf-client --image=networkstatic/netperf --restart=Never -- sleep 3600

# Get service IP
SERVICE_IP=$(kubectl get svc netperf-server -o jsonpath='{.spec.clusterIP}')

# Run latency test
kubectl exec netperf-client -- netperf -H $SERVICE_IP -t TCP_RR -l 60 -- -o mean_latency,p99_latency
```

Compare these results to a cluster running traditional kube-proxy. You should see a 20-40% reduction in mean latency and even larger improvements at the 99th percentile.

## Monitoring and Troubleshooting

Cilium provides detailed metrics about service load balancing. Access the Cilium agent metrics:

```bash
kubectl -n kube-system port-forward ds/cilium 9090:9090
```

Query service-related metrics:

```bash
# Service connection metrics
curl http://localhost:9090/metrics | grep cilium_services

# Backend health status
curl http://localhost:9090/metrics | grep cilium_lb_backend
```

For troubleshooting, use the Cilium service list command:

```bash
kubectl -n kube-system exec ds/cilium -- cilium service list
```

This shows all services and their backends with health status. Check for services with no healthy backends or unexpected backend counts.

View detailed eBPF map statistics:

```bash
kubectl -n kube-system exec ds/cilium -- cilium bpf lb list
```

This displays the actual eBPF maps used for service load balancing.

## Handling Node Port Allocation

Cilium's kube-proxy replacement manages NodePort allocation differently. By default, it uses the same port range as kube-proxy (30000-32767), but you can customize it:

```bash
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values \
  --set nodePort.range="30000-32767"
```

Cilium also supports binding NodePort services to specific interfaces or IP addresses:

```bash
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values \
  --set nodePort.bindProtection=true \
  --set nodePort.enableHealthCheck=true
```

The health check feature adds liveness probes for NodePort services, allowing external load balancers to detect node failures.

## Rollback Procedure

If you need to roll back to kube-proxy, follow these steps carefully:

```bash
# Reinstall kube-proxy
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/kube-proxy/kube-proxy.yaml

# Wait for kube-proxy to be ready
kubectl -n kube-system rollout status ds/kube-proxy

# Disable kube-proxy replacement in Cilium
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=false

# Restart Cilium pods
kubectl -n kube-system rollout restart ds/cilium
```

Test connectivity thoroughly after rollback to ensure services work correctly.

## Conclusion

Replacing kube-proxy with Cilium's eBPF implementation delivers measurable performance improvements and simplifies cluster networking. The O(1) lookup performance, reduced latency, and advanced features like DSR make it a compelling upgrade for production clusters. Start with a development cluster to validate the configuration, then roll it out to production once you've verified performance gains in your specific environment.
