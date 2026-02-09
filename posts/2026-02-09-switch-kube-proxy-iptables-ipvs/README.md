# How to Switch kube-proxy from iptables to IPVS Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kube-proxy, IPVS, iptables, Performance, Networking

Description: Learn how to migrate kube-proxy from iptables mode to IPVS mode for better performance, lower latency, and improved scalability in large Kubernetes clusters.

---

The default iptables mode for kube-proxy works fine for small clusters but struggles as you scale. With thousands of services, iptables rule updates become slow and CPU-intensive. IPVS mode solves this with kernel-level load balancing that handles massive scale efficiently. This guide shows you how to make the switch safely.

## Why Switch to IPVS

IPVS (IP Virtual Server) offers significant advantages over iptables:

- **Performance**: IPVS uses hash tables instead of sequential rule lists. Rule updates are O(1) instead of O(n).
- **Scalability**: Handles 10,000+ services without breaking a sweat. iptables struggles beyond 5,000.
- **Load balancing algorithms**: IPVS supports round robin, least connection, source hashing, and more. iptables only has random selection.
- **Lower latency**: IPVS processes packets faster, reducing network latency.
- **Better resource usage**: Lower CPU overhead on nodes.

The trade-off is slightly more complex debugging and the need for additional kernel modules.

## Prerequisites

Before switching, verify your nodes support IPVS:

```bash
# SSH to a node and check for IPVS kernel modules
lsmod | grep ip_vs

# If empty, try loading them
sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh

# Verify
lsmod | grep ip_vs
```

You should see output like:

```
ip_vs_sh               16384  0
ip_vs_wrr              16384  0
ip_vs_rr               16384  0
ip_vs                 155648  6 ip_vs_rr,ip_vs_sh,ip_vs_wrr
```

Install ipvsadm for managing IPVS:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ipvsadm ipset

# RHEL/CentOS
sudo yum install -y ipvsadm ipset

# Verify installation
ipvsadm --version
```

## Making Kernel Modules Persistent

Ensure IPVS modules load on boot:

```bash
# Create modules config
cat <<EOF | sudo tee /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF

# Verify they'll load on next boot
sudo systemctl restart systemd-modules-load
```

Repeat this on all nodes in your cluster, or better yet, bake it into your node image.

## Switching kube-proxy to IPVS Mode

The method depends on how you deployed Kubernetes.

### For kubeadm Clusters

Edit the kube-proxy ConfigMap:

```bash
kubectl edit configmap kube-proxy -n kube-system
```

Find the `mode:` field and change it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |-
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"  # Change from "iptables" to "ipvs"
    ipvs:
      scheduler: "rr"  # Round robin, options: rr, lc, dh, sh, sed, nq
      minSyncPeriod: 0s
      syncPeriod: 30s
      strictARP: false
    # ... rest of config
```

Save and exit. Now restart kube-proxy pods:

```bash
# Delete kube-proxy pods to reload config
kubectl delete pod -n kube-system -l k8s-app=kube-proxy

# Watch them restart
kubectl get pods -n kube-system -l k8s-app=kube-proxy -w
```

### For Managed Kubernetes (EKS, GKE, AKS)

Managed Kubernetes platforms handle this differently.

**Amazon EKS**: Edit the `aws-node` DaemonSet or use an addon configuration. For EKS 1.25+:

```bash
# Update kube-proxy addon
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name kube-proxy \
  --configuration-values '{"mode":"ipvs"}'
```

**Google GKE**: IPVS is available on GKE 1.22+. Update cluster configuration:

```bash
gcloud container clusters update my-cluster \
  --enable-network-policy \
  --network-policy=PROVIDER_UNSPECIFIED
```

GKE uses a different approach - check the latest documentation.

**Azure AKS**: Edit the kube-proxy ConfigMap similar to kubeadm, but be aware AKS may override your changes. Use Azure CNI configuration instead:

```bash
az aks update -n my-cluster -g my-resource-group --network-plugin azure
```

### For kops Clusters

Edit your cluster spec:

```bash
kops edit cluster my-cluster.k8s.local
```

Add or modify the kubeProxy section:

```yaml
spec:
  kubeProxy:
    enabled: true
    proxyMode: IPVS
    ipvs:
      scheduler: rr
```

Apply the changes:

```bash
kops update cluster my-cluster.k8s.local --yes
kops rolling-update cluster my-cluster.k8s.local --yes
```

## Configuring IPVS Scheduler Algorithm

IPVS supports multiple load balancing algorithms. Choose based on your workload:

```yaml
ipvs:
  scheduler: "rr"  # Options:
  # rr  - Round Robin (default, good for most cases)
  # lc  - Least Connection (good for long-lived connections)
  # dh  - Destination Hashing (consistent hashing by destination)
  # sh  - Source Hashing (for session affinity)
  # sed - Shortest Expected Delay
  # nq  - Never Queue
```

For general-purpose clusters, stick with round robin (rr). For applications with long-lived connections like WebSockets, try least connection (lc).

Update the ConfigMap with your chosen scheduler:

```bash
kubectl edit configmap kube-proxy -n kube-system
```

```yaml
ipvs:
  scheduler: "lc"
  minSyncPeriod: 0s
  syncPeriod: 30s
```

Restart kube-proxy:

```bash
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
```

## Verifying the Switch

Confirm kube-proxy is using IPVS:

```bash
# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i ipvs

# You should see:
# "Using ipvs Proxier"
```

On a node, verify IPVS rules exist:

```bash
# SSH to a node
sudo ipvsadm -L -n

# You should see virtual services (cluster IPs) with real servers (pod IPs)
```

Example output:

```
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  10.96.0.1:443 rr
  -> 172.18.0.2:6443              Masq    1      0          0
TCP  10.96.0.10:53 rr
  -> 10.244.0.3:53                Masq    1      0          0
  -> 10.244.0.4:53                Masq    1      0          0
```

## Testing After the Switch

Deploy a test service to verify everything works:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipvs-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ipvs-test
  template:
    metadata:
      labels:
        app: ipvs-test
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
  name: ipvs-test
spec:
  selector:
    app: ipvs-test
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f ipvs-test.yaml

# Get the service IP
kubectl get svc ipvs-test
```

Check IPVS rules for this service:

```bash
# On a node
SERVICE_IP=$(kubectl get svc ipvs-test -o jsonpath='{.spec.clusterIP}')
sudo ipvsadm -L -n | grep -A 5 $SERVICE_IP
```

Test connectivity:

```bash
kubectl run test-pod --image=curlimages/curl -it --rm -- curl http://ipvs-test.default.svc.cluster.local
```

## Handling iptables Remnants

After switching to IPVS, kube-proxy still creates some iptables rules for:

- SNAT for traffic leaving the cluster
- NodePort services
- LoadBalancer services
- Network policies (if using iptables for policies)

This is normal. Check what remains:

```bash
# On a node
sudo iptables -t nat -L KUBE-SERVICES -n -v
```

You'll see a much smaller ruleset than before. The actual load balancing happens in IPVS now.

## Monitoring IPVS Performance

Track IPVS performance with these metrics:

```bash
# Connection statistics
sudo ipvsadm -L -n --stats

# Rate statistics
sudo ipvsadm -L -n --rate

# Real-time connection table
watch -n 1 'sudo ipvsadm -L -n --stats'
```

For Prometheus monitoring, use the kube-proxy metrics endpoint:

```bash
kubectl port-forward -n kube-system kube-proxy-xxxxx 10249:10249

# Query metrics
curl http://localhost:10249/metrics | grep kubeproxy_sync
```

Key metrics:

- `kubeproxy_sync_proxy_rules_duration_seconds`: Time to sync rules (should be lower with IPVS)
- `kubeproxy_sync_proxy_rules_iptables_total`: Still tracked but should show minimal iptables usage
- `kubeproxy_network_programming_duration_seconds`: Network programming latency

## Rolling Back to iptables

If you need to rollback:

```bash
kubectl edit configmap kube-proxy -n kube-system
```

Change mode back:

```yaml
mode: "iptables"
```

Restart kube-proxy:

```bash
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
```

kube-proxy will clean up IPVS rules and recreate iptables rules automatically.

## Common Issues and Solutions

### IPVS Modules Not Loading

**Problem**: `lsmod | grep ip_vs` shows nothing after switching.

**Solution**: Ensure modules are installed and configured to load on boot:

```bash
# Install kernel modules
sudo apt-get install -y linux-modules-extra-$(uname -r)

# Configure to load on boot
cat <<EOF | sudo tee /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF

# Load immediately
sudo modprobe ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh
```

### kube-proxy Crashes After Switch

**Problem**: kube-proxy pods crash loop with IPVS errors.

**Solution**: Check logs:

```bash
kubectl logs -n kube-system kube-proxy-xxxxx
```

Common errors:

- Missing ipset: `sudo apt-get install ipset`
- Missing conntrack: `sudo apt-get install conntrack`
- Kernel version too old: Upgrade kernel to 4.19+

### Services Not Reachable

**Problem**: Services worked with iptables but fail with IPVS.

**Solution**: Verify IPVS entries exist:

```bash
sudo ipvsadm -L -n | grep <service-ip>
```

If missing, check kube-proxy logs for sync errors. Ensure endpoints exist:

```bash
kubectl get endpoints <service-name>
```

### High CPU Usage After Switch

**Problem**: Node CPU usage increased instead of decreased.

**Solution**: Check if conntrack table is full:

```bash
sudo sysctl net.netfilter.nf_conntrack_count
sudo sysctl net.netfilter.nf_conntrack_max
```

If count is near max, increase the limit:

```bash
sudo sysctl -w net.netfilter.nf_conntrack_max=1048576
```

Make it persistent:

```bash
echo "net.netfilter.nf_conntrack_max=1048576" | sudo tee -a /etc/sysctl.conf
```

## Best Practices

When switching to IPVS:

- Test in a development cluster first
- Ensure all nodes have IPVS modules available
- Use a rolling node upgrade to switch gradually
- Monitor service connectivity closely after the switch
- Keep kube-proxy logs available for debugging
- Use round robin scheduler unless you have specific needs
- Document the change and rollback procedure
- Update your runbooks with IPVS debugging commands
- Consider using strictARP: true if using MetalLB
- Monitor conntrack table size and increase if needed

Switching to IPVS is one of the best performance optimizations you can make in large Kubernetes clusters. The improvement in rule sync time and packet processing latency is dramatic, especially when you have hundreds or thousands of services.
