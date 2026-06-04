# How to Implement Bandwidth Limiting per Pod Using CNI Bandwidth Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Bandwidth, QoS, Networking

Description: Configure bandwidth limiting for individual Kubernetes pods using the CNI bandwidth plugin to prevent resource monopolization, ensure fair network access, and implement quality of service policies.

---

Without bandwidth limits, a single pod can saturate network links and starve other workloads. The CNI bandwidth plugin provides pod-level traffic shaping, enabling you to enforce bandwidth limits through Kubernetes pod annotations. This guide shows you how to implement fair network resource allocation across your cluster.

## Understanding CNI Bandwidth Plugin

The bandwidth plugin is a standard CNI plugin that shapes traffic using Linux traffic control (tc). It supports:

- Ingress (inbound) bandwidth limiting
- Egress (outbound) bandwidth limiting
- Per-pod configuration via annotations
- Token bucket algorithm for smooth traffic shaping

The plugin works with CNI configurations that support chained plugins. Kubernetes treats these traffic shaping annotations as an experimental feature, so verify support with your CNI provider before using them in production.

## Installing the Bandwidth Plugin

Most CNI installations don't include the bandwidth plugin by default. Install it manually.

### On Each Node

```bash
# Download CNI plugins

ARCH="amd64"
CNI_VERSION=$(curl -fsSL https://api.github.com/repos/containernetworking/plugins/releases/latest | jq -r .tag_name)
wget https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-${ARCH}-${CNI_VERSION}.tgz

# Extract to CNI bin directory
sudo tar -xzf cni-plugins-linux-${ARCH}-${CNI_VERSION}.tgz -C /opt/cni/bin

# Verify bandwidth plugin exists
ls -la /opt/cni/bin/bandwidth
```

### Verify Installation

```bash
/opt/cni/bin/bandwidth --version
```

## Configuring CNI to Use Bandwidth Plugin

The bandwidth plugin integrates into your CNI configuration as a chained plugin.

### For Calico

Edit Calico CNI configuration:

```bash
kubectl edit configmap calico-config -n kube-system
```

Add bandwidth plugin to the plugin chain:

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: calico-config
  namespace: kube-system
data:
  cni_network_config: |-
    {
      "name": "k8s-pod-network",
      "cniVersion": "0.4.0",
      "plugins": [
        {
          "type": "calico",
          "ipam": {
            "type": "calico-ipam"
          },
          "policy": {
            "type": "k8s"
          }
        },
        {
          "type": "bandwidth",
          "capabilities": {"bandwidth": true}
        }
      ]
    }
```

### For Flannel

Edit Flannel ConfigMap:

```bash
kubectl edit configmap kube-flannel-cfg -n kube-flannel
```

Add bandwidth plugin:

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.4.0",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true
          }
        },
        {
          "type": "bandwidth",
          "capabilities": {"bandwidth": true}
        }
      ]
    }
```

### For Custom CNI Configuration

If you manually manage CNI config files on nodes:

```bash
sudo vim /etc/cni/net.d/10-mynet.conflist
```

```json
{
  "name": "mynet",
  "cniVersion": "0.4.0",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "mynet0",
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "subnet": "10.244.0.0/16"
      }
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true}
    }
  ]
}
```

Restart your CNI DaemonSet:

```bash
kubectl rollout restart daemonset calico-node -n kube-system
# or
kubectl rollout restart daemonset kube-flannel-ds -n kube-flannel
```

## Applying Bandwidth Limits to Pods

Configure limits using pod annotations.

### Basic Bandwidth Limiting

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited-pod
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"   # 10 megabits per second ingress
    kubernetes.io/egress-bandwidth: "5M"     # 5 megabits per second egress
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
```

Bandwidth units:

- `K` or `k`: Kilobits per second (1000 bits/sec)
- `M` or `m`: Megabits per second (1,000,000 bits/sec)
- `G` or `g`: Gigabits per second (1,000,000,000 bits/sec)

### Deployment with Bandwidth Limits

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
      annotations:
        kubernetes.io/ingress-bandwidth: "100M"
        kubernetes.io/egress-bandwidth: "50M"
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
```

All pods in this deployment get 100 Mbps ingress and 50 Mbps egress limits.

## Testing Bandwidth Limits

Verify limits are enforced:

### Create Test Pods

```yaml
# server-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-server
spec:
  containers:
  - name: tools
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "while true; do sleep 3600; done"]
---
# client-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-client
  annotations:
    kubernetes.io/egress-bandwidth: "10M"  # Limit client to 10 Mbps
spec:
  containers:
  - name: tools
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "while true; do sleep 3600; done"]
```

Deploy:

```bash
kubectl apply -f server-pod.yaml
kubectl apply -f client-pod.yaml
```

### Run Bandwidth Test with iperf

```bash
# On server pod, run iperf server
kubectl exec bandwidth-server -- iperf3 -s -D

# Get server pod IP
SERVER_IP=$(kubectl get pod bandwidth-server -o jsonpath='{.status.podIP}')

# On client pod, test bandwidth
kubectl exec bandwidth-client -- iperf3 -c $SERVER_IP -t 30

# Results should show ~10 Mbps due to egress limit
```

Example output:

```text
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec  35.8 MBytes  10.0 Mbits/sec  sender
[  4]   0.00-30.00  sec  35.7 MBytes  9.98 Mbits/sec  receiver
```

### Test Without Limits

Remove the annotation from `client-pod.yaml`, recreate the pod, and test again:

```bash
kubectl delete pod bandwidth-client
kubectl apply -f client-pod.yaml

# Re-run iperf3 test
kubectl exec bandwidth-client -- iperf3 -c $SERVER_IP -t 30

# Should show much higher throughput
```

## Inspecting Traffic Control Rules

The bandwidth plugin uses Linux tc to enforce limits. Inspect them:

```bash
# Find the pod sandbox and network namespace on the node running the pod
POD_SANDBOX_ID=$(sudo crictl pods --name bandwidth-client -q | head -1)
NETNS=$(sudo crictl inspectp "$POD_SANDBOX_ID" | jq -r '.info.runtimeSpec.linux.namespaces[] | select(.type=="network") | .path')

# View tc rules on the pod interface
sudo nsenter --net="$NETNS" tc qdisc show dev eth0
```

Example output:

```text
qdisc tbf 1: root refcnt 2 rate 10Mbit burst 10Kb lat 50ms
```

This shows a 10 Mbit rate limit enforced by TBF (Token Bucket Filter).

## Advanced Bandwidth Configuration

### Different Limits for Different Workloads

```yaml
# High-priority application
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
  annotations:
    kubernetes.io/ingress-bandwidth: "1G"
    kubernetes.io/egress-bandwidth: "1G"
spec:
  containers:
  - name: app
    image: critical-app:latest
---
# Background batch job
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
  annotations:
    kubernetes.io/ingress-bandwidth: "50M"
    kubernetes.io/egress-bandwidth: "50M"
spec:
  containers:
  - name: worker
    image: batch-worker:latest
```

### Dynamic Bandwidth Adjustment

Use admission webhooks to set bandwidth based on pod labels:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: bandwidth-injector
webhooks:
- name: bandwidth.example.com
  clientConfig:
    service:
      name: bandwidth-webhook
      namespace: kube-system
      path: "/mutate"
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
```

The webhook can inspect pod labels and inject appropriate bandwidth annotations.

## Monitoring Bandwidth Usage

Track actual bandwidth consumption:

### Using Kubelet Summary Metrics

```bash
# Query kubelet summary metrics through the Kubernetes API server
NODE=$(kubectl get pod bandwidth-client -o jsonpath='{.spec.nodeName}')

# Query network metrics
kubectl get --raw "/api/v1/nodes/$NODE/proxy/stats/summary" | jq '.pods[] | select(.podRef.name == "bandwidth-client") | .network'
```

### Using Prometheus

Query pod network metrics:

```promql
# Transmit bytes
rate(container_network_transmit_bytes_total{pod="bandwidth-client"}[5m])

# Receive bytes
rate(container_network_receive_bytes_total{pod="bandwidth-client"}[5m])
```

Convert to bits per second:

```promql
rate(container_network_transmit_bytes_total{pod="bandwidth-client"}[5m]) * 8
```

### Create Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Pod Bandwidth Usage",
    "panels": [
      {
        "title": "Egress Bandwidth",
        "targets": [
          {
            "expr": "rate(container_network_transmit_bytes_total{namespace='default'}[5m]) * 8 / 1000000",
            "legendFormat": "{{pod}}"
          }
        ]
      },
      {
        "title": "Ingress Bandwidth",
        "targets": [
          {
            "expr": "rate(container_network_receive_bytes_total{namespace='default'}[5m]) * 8 / 1000000",
            "legendFormat": "{{pod}}"
          }
        ]
      }
    ]
  }
}
```

## Combining Bandwidth Limits with Network Policies

Combine with network policies to control which destinations are allowed. The bandwidth annotation still applies to all egress traffic from the pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: selective-limits
  labels:
    app: selective-limits
  annotations:
    kubernetes.io/egress-bandwidth: "100M"
spec:
  containers:
  - name: app
    image: myapp:latest
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: limit-external-traffic
spec:
  podSelector:
    matchLabels:
      app: selective-limits
  policyTypes:
  - Egress
  egress:
  # Allow traffic to pods in the same namespace
  - to:
    - podSelector: {}
  # Allow HTTPS traffic to external destinations
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 443
```

## Troubleshooting Bandwidth Limits

### Limits Not Applied

Check CNI configuration:

```bash
# Verify bandwidth plugin in CNI config
cat /etc/cni/net.d/*.conflist | jq '.plugins[] | select(.type=="bandwidth")'

# Check plugin file exists
ls -la /opt/cni/bin/bandwidth
```

View kubelet logs for CNI errors:

```bash
sudo journalctl -u kubelet | grep -i bandwidth
```

### Performance Issues

If bandwidth limiting causes performance problems:

1. Check if limits are too restrictive
2. Verify network isn't saturated
3. Look for packet loss or errors

```bash
# Check interface statistics
kubectl exec pod-name -- ip -s link show eth0

# Look for:
# RX errors, dropped, overruns
# TX errors, dropped, overruns
```

### Inconsistent Behavior

Ensure all nodes have the bandwidth plugin:

```bash
# Check on each node
ansible all -m shell -a "ls -la /opt/cni/bin/bandwidth"

# Or with kubectl (if you have a debug daemonset)
kubectl exec -n kube-system daemonset/node-shell -- ls -la /opt/cni/bin/bandwidth
```

## Best Practices

When implementing bandwidth limits:

- Set limits based on application requirements, not arbitrary values
- Monitor actual usage before setting limits
- Use higher limits for production, lower for dev/test
- Document why specific limits were chosen
- Test limits thoroughly before production deployment
- Combine with resource requests/limits for comprehensive QoS
- Use admission controllers to enforce limits automatically
- Monitor for pods hitting bandwidth limits
- Plan capacity based on total bandwidth needed
- Consider burst requirements when setting limits

Bandwidth limiting with the CNI plugin brings network quality of service to Kubernetes. It prevents noisy neighbors, ensures fair resource allocation, and helps maintain predictable application performance even under heavy load.
