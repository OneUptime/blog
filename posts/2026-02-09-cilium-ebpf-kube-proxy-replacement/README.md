# How to Configure Cilium eBPF-Based kube-proxy Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, eBPF

Description: Replace kube-proxy with Cilium's eBPF-based implementation to reduce latency, improve throughput.

---

The traditional kube-proxy component in Kubernetes uses iptables or IPVS to handle service load balancing. While functional, these approaches can introduce latency and create complex iptables chains that become difficult to debug at scale. Cilium offers an eBPF-based kube-proxy replacement that avoids kube-proxy's service iptables or IPVS datapath. This guide shows you how to implement it.

## Why Replace kube-proxy

Before diving into configuration, you should understand why replacing kube-proxy matters. The standard kube-proxy implementation creates iptables rules for every service and endpoint in your cluster. On a cluster with 1,000 services and 5,000 endpoints, you end up with tens of thousands of iptables rules.

In iptables mode, packet matching can traverse rule chains until it finds a match. This can degrade as your cluster grows. You'll notice increased latency and CPU usage as your cluster scales.

Cilium's eBPF implementation uses maps for efficient lookups and processes packets directly in the kernel without kube-proxy's iptables overhead. You get more consistent performance as service count grows.

The eBPF datapath also enables advanced features like direct server return (DSR), which allows response traffic to bypass load balancing hops and return directly to clients. This can reduce latency for many workloads.

## Prerequisites and Cluster Preparation

You need a Kubernetes cluster running a version supported by your Cilium release. For Cilium 1.19, the tested Kubernetes versions are 1.31 through 1.34, and hosts should run Linux kernel 5.10 or later, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel. Most modern Linux distributions meet this requirement. Check your kernel version:

```bash
# Check kernel version on all nodes

kubectl get nodes -o wide

# Or SSH to a node and check directly
uname -r
```

If you're building a new cluster, disable kube-proxy from the start. For kubeadm clusters:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
---
apiVersion: kubeadm.k8s.io/v1beta4
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
helm install cilium cilium/cilium --version 1.19.4 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=API_SERVER_IP \
  --set k8sServicePort=API_SERVER_PORT \
  --set bpf.masquerade=true \
  --set prometheus.enabled=true \
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
```

Then SSH to each node and remove kube-proxy iptables rules:

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
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement
```

You'll see output like:

```text
KubeProxyReplacement:    True   [eth0 10.0.1.5 (Direct Routing)]
```

## Enabling Advanced Features

With kube-proxy replacement active, you can enable additional performance optimizations. Direct Server Return (DSR) mode allows response traffic to bypass the load balancer:

```bash
helm upgrade cilium cilium/cilium --version 1.19.4 \
  --namespace kube-system \
  --reuse-values \
  --set routingMode=native \
  --set loadBalancer.mode=dsr \
  --set loadBalancer.dsrDispatch=opt
```

DSR mode requires native routing or a supported DSR dispatch mode for your environment. It works best when your network and load balancer path can route replies directly from backends to clients.

Enable Maglev consistent hashing for better load distribution:

```bash
SEED=$(head -c12 /dev/urandom | base64 -w0)

helm upgrade cilium cilium/cilium --version 1.19.4 \
  --namespace kube-system \
  --reuse-values \
  --set loadBalancer.algorithm=maglev \
  --set maglev.tableSize=65521 \
  --set maglev.hashSeed=$SEED
```

Maglev hashing reduces backend reassignment when backends change. In Cilium, Maglev applies to external north-south traffic, not in-cluster east-west service connections that are handled by socket load balancing.

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

Compare these results to a cluster running traditional kube-proxy. You may see lower mean latency and larger improvements at the 99th percentile, but the exact gain depends on your workload, kernel, routing mode, and service topology.

## Monitoring and Troubleshooting

Cilium provides detailed metrics about service load balancing. Access the Cilium agent metrics:

```bash
kubectl -n kube-system port-forward ds/cilium 9962:9962
```

Query service-related metrics:

```bash
# Service connection metrics
curl http://localhost:9962/metrics | grep cilium_services

# Backend health status
curl http://localhost:9962/metrics | grep cilium_lb_backend
```

For troubleshooting, use the Cilium service list command:

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list
```

This shows all services and their backends with health status. Check for services with no healthy backends or unexpected backend counts.

View detailed eBPF map statistics:

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list
```

This displays the actual eBPF maps used for service load balancing.

## Handling Node Port Allocation

NodePort allocation is controlled by the Kubernetes API server's `--service-node-port-range` setting. By default, Kubernetes uses 30000-32767. Cilium's kube-proxy replacement handles traffic for NodePort services in that configured range, but it does not change the API server's allocation range.

```bash
# Set this on kube-apiserver, not in the Cilium chart
--service-node-port-range=30000-32767
```

Cilium also supports binding NodePort services to specific interfaces or IP addresses:

```bash
helm upgrade cilium cilium/cilium --version 1.19.4 \
  --namespace kube-system \
  --reuse-values \
  --set nodePort.addresses="{192.168.1.0/24}" \
  --set nodePort.bindProtection=true \
  --set nodePort.enableHealthCheck=true
```

The health check feature enables the health check NodePort server for NodePort services. You can also enable the kube-proxy replacement healthz endpoint with `--set kubeProxyReplacementHealthzBindAddr=0.0.0.0:10256` if external load balancers expect kube-proxy's health check port.

## Rollback Procedure

If you need to roll back to kube-proxy, follow these steps carefully:

```bash
# Reinstall kube-proxy on kubeadm clusters
sudo kubeadm init phase addon kube-proxy --config kubeadm-config.yaml

# Wait for kube-proxy to be ready
kubectl -n kube-system rollout status ds/kube-proxy

# Disable kube-proxy replacement in Cilium
helm upgrade cilium cilium/cilium --version 1.19.4 \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=false

# Restart Cilium pods
kubectl -n kube-system rollout restart ds/cilium
```

Test connectivity thoroughly after rollback to ensure services work correctly.

## Conclusion

Replacing kube-proxy with Cilium's eBPF implementation delivers measurable performance improvements and simplifies cluster networking. The efficient map-based service lookup, reduced latency, and advanced features like DSR make it a compelling upgrade for production clusters. Start with a development cluster to validate the configuration, then roll it out to production once you've verified performance gains in your specific environment.
