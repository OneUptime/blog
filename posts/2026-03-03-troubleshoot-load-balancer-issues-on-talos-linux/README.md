# How to Troubleshoot Load Balancer Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Load Balancer, Troubleshooting, MetalLB, Kubernetes, Debugging

Description: Diagnose and fix common load balancer problems on Talos Linux clusters including stuck pending services, unreachable IPs, and traffic distribution issues.

---

Load balancer issues on Talos Linux can be frustrating because they involve multiple components: the load balancer controller, kube-proxy, network configuration, and the underlying Linux networking stack. When a LoadBalancer service does not work, the problem could be anywhere in that chain. This guide walks through systematic troubleshooting of the most common load balancer problems on Talos Linux clusters.

## Problem 1: Service Stuck in Pending State

The most common issue is a LoadBalancer service that never gets an external IP:

```bash
$ kubectl get svc my-app
NAME     TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
my-app   LoadBalancer   10.96.1.50    <pending>     80:31234/TCP   10m
```

### Diagnosis Steps

```bash
# Step 1: Check if a load balancer controller is installed
kubectl get pods --all-namespaces | grep -E "metallb|kube-vip|cloud-controller"

# Step 2: If MetalLB, check if address pools are configured
kubectl get ipaddresspools -n metallb-system

# Step 3: Check if address pools have available IPs
kubectl get ipaddresspools -n metallb-system -o yaml | grep -A5 addresses

# Step 4: Check MetalLB controller logs for errors
kubectl logs -n metallb-system -l app.kubernetes.io/component=controller --tail=50

# Step 5: Check events on the service
kubectl describe svc my-app | tail -20
```

### Common Causes and Fixes

```bash
# Cause 1: No load balancer controller installed
# Fix: Install MetalLB or kube-vip
helm install metallb metallb/metallb --namespace metallb-system --create-namespace

# Cause 2: No IP address pool configured
# Fix: Create an address pool
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
  - default
EOF

# Cause 3: Address pool exhausted
# Fix: Expand the pool or free unused services
kubectl get svc --all-namespaces -o wide | grep LoadBalancer
# Delete unused LoadBalancer services to free IPs

# Cause 4: Service requesting an IP not in any pool
# Fix: Check the loadBalancerIP field
kubectl get svc my-app -o yaml | grep loadBalancerIP
```

## Problem 2: External IP Assigned But Not Reachable

The service has an IP, but you cannot reach it from outside the cluster:

```bash
$ kubectl get svc my-app
NAME     TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)        AGE
my-app   LoadBalancer   10.96.1.50    192.168.1.200   80:31234/TCP   5m

$ curl http://192.168.1.200
# Hangs or times out
```

### Diagnosis Steps

```bash
# Step 1: Check if the IP is on the same subnet as your client
# Your client must be able to reach the IP via Layer 2 or routing

# Step 2: Check ARP (for MetalLB L2 mode)
arping -c 3 192.168.1.200
# If no response, MetalLB speaker is not announcing

# Step 3: Check MetalLB speaker logs
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=50

# Step 4: Check which node is the leader for this IP
kubectl get events -n metallb-system --sort-by=.lastTimestamp | grep 192.168.1.200

# Step 5: Verify the service has healthy endpoints
kubectl get endpoints my-app
# If ENDPOINTS is <none>, no pods are matching the selector

# Step 6: Test from inside the cluster
kubectl run test --rm -it --restart=Never --image=busybox -- \
    wget -q -O- -T5 http://10.96.1.50:80
# If this works, the issue is between the external IP and the node

# Step 7: Check iptables/IPVS rules on the leader node
# For iptables mode:
talosctl dmesg --nodes $LEADER_NODE | grep -i "iptables\|netfilter"
```

### Common Causes and Fixes

```bash
# Cause 1: Speaker pod not running on the leader node
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker -o wide
# Fix: Check tolerations and node selectors

# Cause 2: Network interface mismatch
# The IP pool is on a different subnet than the node's interface
# Fix: Ensure IPs are on the same L2 network as node IPs

# Cause 3: Firewall blocking traffic
# On Talos, check for any network policies blocking ingress
kubectl get networkpolicies --all-namespaces

# Cause 4: VLAN or network configuration issue
# Check that the switch/router allows the IP range
# Verify ARP responses reach the client
```

## Problem 3: Intermittent Connection Failures

Traffic works sometimes but fails randomly:

### Diagnosis Steps

```bash
# Step 1: Check pod readiness
kubectl get pods -l app=my-app -o wide
# Look for pods that are not Ready

# Step 2: Check for pod restarts
kubectl get pods -l app=my-app --sort-by=.status.containerStatuses[0].restartCount

# Step 3: Check endpoint updates
kubectl get endpoints my-app -w
# Watch for endpoints being added/removed frequently

# Step 4: Check node health
kubectl get nodes
kubectl describe nodes | grep -A5 Conditions

# Step 5: Check for conntrack issues (common with UDP)
talosctl dmesg --nodes $NODE_IP | grep conntrack

# Step 6: Monitor traffic distribution
for i in $(seq 1 20); do
    curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://192.168.1.200
    sleep 0.5
done
```

### Common Causes and Fixes

```bash
# Cause 1: Pod readiness flapping
# Fix: Adjust probe thresholds
# Increase failureThreshold and periodSeconds

# Cause 2: Conntrack table full
# Fix: Increase conntrack limits in Talos config
# machine:
#   sysctls:
#     net.netfilter.nf_conntrack_max: "262144"

# Cause 3: MetalLB leader failover during traffic
# Check if the speaker on the leader node is unstable
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=100 | grep -i "leader\|elected"

# Cause 4: Asymmetric routing
# Traffic enters through one node but response leaves through another
# Fix: Enable source-based routing or use externalTrafficPolicy: Local
```

## Problem 4: Traffic Not Being Distributed Evenly

All traffic goes to one pod instead of being spread across replicas:

```bash
# Step 1: Check if session affinity is configured
kubectl get svc my-app -o yaml | grep -A3 sessionAffinity

# Step 2: Check kube-proxy mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode

# Step 3: Check if externalTrafficPolicy is Local
kubectl get svc my-app -o yaml | grep externalTrafficPolicy

# Step 4: Verify all endpoints are healthy
kubectl get endpoints my-app -o yaml | grep -c "ip:"
```

### Fixes

```yaml
# Remove session affinity if not needed
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  sessionAffinity: None
  type: LoadBalancer
  ports:
  - port: 80
  selector:
    app: my-app
```

```yaml
# Switch to Cluster externalTrafficPolicy for better distribution
# (but lose client IP preservation)
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  externalTrafficPolicy: Cluster  # Default - distributes evenly
  type: LoadBalancer
  ports:
  - port: 80
  selector:
    app: my-app
```

## Problem 5: Connection Drops During Deployments

Traffic fails during rolling updates:

### Diagnosis

```bash
# Watch endpoints during a deployment
kubectl get endpoints my-app -w &

# Trigger a rollout
kubectl rollout restart deployment my-app

# Watch for gaps where endpoints go to 0
```

### Fix: Configure Proper Readiness Gates and PreStop Hooks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Never reduce below desired replicas
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              # Give the load balancer time to drain connections
              command: ["/bin/sh", "-c", "sleep 15"]
```

## Problem 6: Talos-Specific Network Issues

Talos Linux's immutable design means some traditional troubleshooting approaches do not work:

```bash
# Cannot SSH into nodes - use talosctl instead
# Check network interfaces
talosctl get addresses --nodes $NODE_IP

# Check routes
talosctl get routes --nodes $NODE_IP

# Check network connectivity
talosctl netstat --nodes $NODE_IP

# View kernel messages for network errors
talosctl dmesg --nodes $NODE_IP | grep -i "net\|eth\|link\|arp"

# Check Talos service health
talosctl services --nodes $NODE_IP

# Read system logs
talosctl logs kubelet --nodes $NODE_IP | tail -50
```

## Comprehensive Debugging Script

Here is a script that checks all common failure points:

```bash
#!/bin/bash
# debug-loadbalancer.sh
# Comprehensive load balancer debugging for Talos Linux

SERVICE=$1
NAMESPACE=${2:-default}

echo "=== Load Balancer Debug Report ==="
echo "Service: $SERVICE in namespace $NAMESPACE"
echo "Time: $(date)"
echo ""

echo "--- Service Details ---"
kubectl get svc "$SERVICE" -n "$NAMESPACE" -o wide

echo ""
echo "--- Service YAML (relevant fields) ---"
kubectl get svc "$SERVICE" -n "$NAMESPACE" -o yaml | grep -E "type:|externalTrafficPolicy:|loadBalancerIP:|sessionAffinity:|externalIP"

echo ""
echo "--- Endpoints ---"
kubectl get endpoints "$SERVICE" -n "$NAMESPACE"

echo ""
echo "--- Pod Status ---"
SELECTOR=$(kubectl get svc "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.selector}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
kubectl get pods -n "$NAMESPACE" -l "$SELECTOR" -o wide

echo ""
echo "--- Recent Events ---"
kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp | grep "$SERVICE" | tail -10

echo ""
echo "--- MetalLB Status ---"
kubectl get ipaddresspools -n metallb-system 2>/dev/null
kubectl get l2advertisements -n metallb-system 2>/dev/null
kubectl get bgpadvertisements -n metallb-system 2>/dev/null

echo ""
echo "--- MetalLB Speaker Health ---"
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker -o wide 2>/dev/null

echo ""
echo "--- Node Status ---"
kubectl get nodes -o wide

echo ""
echo "=== End Report ==="
```

## Wrapping Up

Load balancer troubleshooting on Talos Linux is systematic. Start with the basics: is the controller running, are address pools configured, does the service have endpoints? Then work outward: can you reach the IP, is ARP working, are there network policy blocks? Most issues fall into a few categories: missing configuration, network reachability, or pod health problems. Keep this guide handy, and you will resolve most load balancer issues within minutes.
