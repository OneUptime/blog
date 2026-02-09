# How to configure network bandwidth limits with CNI plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Networking, Bandwidth, QoS

Description: Configure network bandwidth limits using CNI plugins in Kubernetes including bandwidth plugin setup, per-pod annotations, Calico bandwidth policies, and monitoring bandwidth usage for optimal cluster performance.

---

Network bandwidth limiting prevents pods from consuming excessive network resources and impacting other workloads. While Kubernetes provides CPU and memory limits, network bandwidth often goes unmanaged, leading to unpredictable performance. CNI plugins offer several approaches to bandwidth limiting, from simple annotation-based controls to sophisticated policy-based management.

## Using the Bandwidth CNI Plugin

The bandwidth CNI plugin is the standard way to implement bandwidth limits in Kubernetes. It uses Linux traffic control (tc) under the hood to shape traffic at the pod's veth interface.

First, ensure the bandwidth plugin binary is installed on all nodes:

```bash
# Check if bandwidth plugin exists
ls -la /opt/cni/bin/bandwidth

# If not present, install CNI plugins
CNI_VERSION="v1.3.0"
curl -L "https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz" | \
  tar -C /opt/cni/bin -xz bandwidth

# Verify installation
/opt/cni/bin/bandwidth --version
```

Add the bandwidth plugin to your CNI configuration by chaining it after your primary networking plugin:

```json
{
  "cniVersion": "0.4.0",
  "name": "k8s-pod-network",
  "plugins": [
    {
      "type": "calico",
      "log_level": "info",
      "datastore_type": "kubernetes",
      "nodename": "__KUBERNETES_NODE_NAME__",
      "mtu": 1440,
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      }
    },
    {
      "type": "bandwidth",
      "capabilities": {
        "bandwidth": true
      }
    }
  ]
}
```

Save this configuration to `/etc/cni/net.d/10-calico.conflist` (adjust the filename based on your setup). The CNI runtime will execute plugins in order, with bandwidth applied after basic networking is configured.

## Setting Bandwidth Limits via Pod Annotations

Once the bandwidth plugin is configured, control limits using Kubernetes annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"
    kubernetes.io/egress-bandwidth: "10M"
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
```

The annotations accept bandwidth values with suffixes:
- `K` or `k`: kilobits per second (1000 bits/s)
- `M` or `m`: megabits per second (1000000 bits/s)
- `G` or `g`: gigabits per second
- `Ki`, `Mi`, `Gi`: kibibits, mebibits, gibibits (powers of 1024)

Verify the bandwidth limits are applied:

```bash
# Get pod details
POD_NAME="web-server"
POD_IP=$(kubectl get pod $POD_NAME -o jsonpath='{.status.podIP}')

# Find the veth interface
VETH=$(ip route | grep $POD_IP | awk '{print $3}')
echo "Pod interface: $VETH"

# Check traffic control configuration
tc qdisc show dev $VETH
tc class show dev $VETH

# Expected output shows HTB qdisc with rate limits
# qdisc htb 1: root refcnt 2 r2q 10 default 0 direct_packets_stat 0
# class htb 1:1 root rate 10Mbit ceil 10Mbit burst 1600b cburst 1600b
```

## Implementing Bandwidth Limits in Deployments

Apply bandwidth limits across all pods in a deployment using pod template annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
      annotations:
        kubernetes.io/ingress-bandwidth: "50M"
        kubernetes.io/egress-bandwidth: "50M"
    spec:
      containers:
      - name: api
        image: api-server:v2.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

All pods created by this deployment will have the same bandwidth limits. Update the annotations and perform a rolling update to change limits:

```bash
# Update bandwidth limits
kubectl patch deployment api-server -n production -p '
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "kubernetes.io/ingress-bandwidth": "100M",
          "kubernetes.io/egress-bandwidth": "100M"
        }
      }
    }
  }
}'

# Monitor the rollout
kubectl rollout status deployment/api-server -n production
```

## Using Calico Bandwidth Policy

Calico provides its own bandwidth management that integrates with Kubernetes NetworkPolicy. This offers more granular control than annotations:

```yaml
apiVersion: projectcalico.org/v3
kind singleBandwidthPolicy
metadata:
  name: limit-database-bandwidth
  namespace: production
spec:
  selector: app == "postgres"
  ingress:
    rate: 100M
    burst: 10M
  egress:
    rate: 100M
    burst: 10M
  order: 100
```

Calico bandwidth policies support:
- Selector-based targeting (label matching)
- Namespace isolation
- Burst allowances for handling traffic spikes
- Integration with network policies

Apply the policy:

```bash
calicoctl apply -f bandwidth-policy.yaml

# Verify policy is applied
calicoctl get bandwidthpolicy -n production
```

Check bandwidth enforcement on specific pods:

```bash
# List pods matching the selector
kubectl get pods -n production -l app=postgres

# Check tc configuration on each pod's interface
for pod in $(kubectl get pods -n production -l app=postgres -o name); do
  POD_IP=$(kubectl get $pod -n production -o jsonpath='{.status.podIP}')
  echo "Checking $pod ($POD_IP):"
  VETH=$(ip route | grep $POD_IP | awk '{print $3}')
  tc -s class show dev $VETH 2>/dev/null | grep rate || echo "  No limits found"
done
```

## Flannel with Bandwidth Limiting

Flannel doesn't provide native bandwidth limiting, but you can chain the bandwidth plugin:

```json
{
  "name": "cbr0",
  "cniVersion": "0.3.1",
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
      "capabilities": {
        "bandwidth": true
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    }
  ]
}
```

Update the Flannel ConfigMap:

```bash
kubectl edit configmap kube-flannel-cfg -n kube-system

# Add bandwidth plugin to the plugin chain
# Save and restart Flannel pods
kubectl delete pods -n kube-system -l app=flannel
```

## Testing Bandwidth Limits

Verify bandwidth limits are enforced using iperf3:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"
    kubernetes.io/egress-bandwidth: "10M"
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command: ["iperf3"]
    args: ["-s"]
    ports:
    - containerPort: 5201
---
apiVersion: v1
kind: Pod
metadata:
  name: iperf-client
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command: ["sleep"]
    args: ["3600"]
```

Run bandwidth tests:

```bash
# Get server IP
SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# Run client test
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30

# Expected result should show bandwidth limited to ~10 Mbps
# [ ID] Interval           Transfer     Bitrate
# [  5]   0.00-30.00  sec  36.5 MBytes  10.2 Mbits/sec  sender
# [  5]   0.00-30.00  sec  36.3 MBytes  10.2 Mbits/sec  receiver
```

Test egress limits by reversing the test direction:

```bash
# Run in reverse mode to test egress from server
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -R -t 30
```

## Monitoring Bandwidth Usage

Track actual bandwidth consumption to tune limits appropriately:

```bash
# Install monitoring tools
apt-get install -y ifstat iftop bmon

# Monitor specific veth interface
POD_IP=$(kubectl get pod web-server -o jsonpath='{.status.podIP}')
VETH=$(ip route | grep $POD_IP | awk '{print $3}')

# Real-time bandwidth monitoring
iftop -i $VETH

# Show statistics over time
ifstat -i $VETH 1

# Check traffic control statistics
tc -s class show dev $VETH

# Look for drops or backlog
tc -s qdisc show dev $VETH | grep -E "dropped|backlog"
```

Export metrics to Prometheus using node-exporter with textfile collector:

```bash
#!/bin/bash
# /usr/local/bin/bandwidth-metrics.sh

TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
OUTPUT_FILE="$TEXTFILE_DIR/bandwidth_limits.prom"

{
  echo "# HELP pod_bandwidth_limit_bps Bandwidth limit in bits per second"
  echo "# TYPE pod_bandwidth_limit_bps gauge"

  for veth in $(ip -o link show | grep veth | awk -F': ' '{print $2}'); do
    POD_IP=$(ip route | grep $veth | awk '{print $1}' | head -1)

    if [ ! -z "$POD_IP" ]; then
      # Get ingress limit
      INGRESS=$(tc class show dev $veth 2>/dev/null | grep "class htb" | awk '{print $9}' | tr -d 'Mbit' | head -1)
      if [ ! -z "$INGRESS" ]; then
        INGRESS_BPS=$(echo "$INGRESS * 1000000" | bc)
        echo "pod_bandwidth_limit_bps{interface=\"$veth\",pod_ip=\"$POD_IP\",direction=\"ingress\"} $INGRESS_BPS"
      fi
    fi
  done
} > "$OUTPUT_FILE.$$"

mv "$OUTPUT_FILE.$$" "$OUTPUT_FILE"
```

Schedule this script with cron:

```bash
# Run every minute
echo "* * * * * /usr/local/bin/bandwidth-metrics.sh" | crontab -
```

## Dynamic Bandwidth Adjustment

Implement a controller that adjusts bandwidth based on metrics:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func adjustBandwidth(clientset *kubernetes.Clientset, podName, namespace string, newLimit string) error {
    pod, err := clientset.CoreV1().Pods(namespace).Get(context.TODO(), podName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    if pod.Annotations == nil {
        pod.Annotations = make(map[string]string)
    }

    pod.Annotations["kubernetes.io/ingress-bandwidth"] = newLimit
    pod.Annotations["kubernetes.io/egress-bandwidth"] = newLimit

    _, err = clientset.CoreV1().Pods(namespace).Update(context.TODO(), pod, metav1.UpdateOptions{})
    return err
}

func main() {
    config, _ := rest.InClusterConfig()
    clientset, _ := kubernetes.NewForConfig(config)

    for {
        // Check metrics and adjust bandwidth
        // This is a simplified example
        pods, _ := clientset.CoreV1().Pods("production").List(context.TODO(), metav1.ListOptions{
            LabelSelector: "tier=frontend",
        })

        for _, pod := range pods.Items {
            // Logic to determine if bandwidth adjustment is needed
            currentLimit := pod.Annotations["kubernetes.io/ingress-bandwidth"]
            if currentLimit == "10M" {
                // Increase to 20M during peak hours
                adjustBandwidth(clientset, pod.Name, pod.Namespace, "20M")
                fmt.Printf("Increased bandwidth for %s\n", pod.Name)
            }
        }

        time.Sleep(5 * time.Minute)
    }
}
```

Note that updating annotations requires pod restart to take effect. For dynamic adjustment without restart, you need to interact with tc directly on the nodes.

## Troubleshooting Bandwidth Limits

Common issues and solutions:

```bash
# Issue: Bandwidth limits not applied
# Check 1: Verify CNI plugin chain includes bandwidth plugin
cat /etc/cni/net.d/*.conflist | grep bandwidth

# Check 2: Ensure plugin binary exists
ls -l /opt/cni/bin/bandwidth

# Check 3: View CNI logs
journalctl -u kubelet | grep CNI | grep bandwidth

# Issue: Pods can exceed limits
# Verify tc rules are actually configured
tc qdisc show dev $(ip route | grep $POD_IP | awk '{print $3}')

# Issue: Performance degradation
# Check for excessive packet drops
tc -s qdisc show dev $VETH | grep dropped

# If drops are high, increase burst parameter
# (requires CNI configuration change)
```

Network bandwidth limits with CNI plugins provide essential QoS capabilities for Kubernetes clusters. Whether using simple annotations with the bandwidth plugin or sophisticated policy-based controls with Calico, proper bandwidth management ensures fair resource allocation and prevents network congestion in multi-tenant environments.
