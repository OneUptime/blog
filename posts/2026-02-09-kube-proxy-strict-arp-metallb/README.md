# How to Configure kube-proxy Strict ARP for MetalLB Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kube-proxy, MetalLB, ARP, Load Balancer, Networking

Description: Configure kube-proxy strict ARP mode to enable proper MetalLB operation for bare-metal Kubernetes load balancing with Layer 2 mode and avoid IP address conflicts.

---

MetalLB brings cloud-provider load balancers to bare-metal Kubernetes clusters. When running in Layer 2 mode, MetalLB needs exclusive control over ARP responses for service IPs. By default, kube-proxy can interfere with this, causing traffic to go to the wrong nodes. Enabling strict ARP mode solves this problem by preventing kube-proxy from responding to ARP requests.

## Understanding the ARP Conflict

In Layer 2 mode, MetalLB assigns service IPs to nodes and responds to ARP requests saying "this IP is at my MAC address." This lets external clients reach the service through that specific node.

The problem: kube-proxy in IPVS mode also configures service IPs on nodes. Multiple nodes might respond to ARP requests for the same IP, creating a race condition. Traffic ends up distributed unpredictably across nodes, breaking MetalLB's speaker election and causing connectivity issues.

Strict ARP mode tells the kernel to only answer ARP requests for IPs actually assigned to that specific interface, not all IPs the node knows about. This gives MetalLB exclusive control over ARP responses.

## Checking Current ARP Configuration

Before making changes, check your current settings:

```bash
# SSH to a node
# Check ARP announce setting
sysctl net.ipv4.conf.all.arp_announce

# Check ARP ignore setting
sysctl net.ipv4.conf.all.arp_ignore
```

Default values are typically 0, which allows promiscuous ARP behavior.

## Enabling Strict ARP in kube-proxy

The configuration method depends on your kube-proxy mode.

### For IPVS Mode (Recommended with MetalLB)

Edit the kube-proxy ConfigMap:

```bash
kubectl edit configmap kube-proxy -n kube-system
```

Add or modify the `strictARP` setting:

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
    mode: "ipvs"
    ipvs:
      strictARP: true  # Add this line
      scheduler: "rr"
      syncPeriod: 30s
```

Save and restart kube-proxy:

```bash
kubectl rollout restart daemonset kube-proxy -n kube-system

# Watch the rollout
kubectl rollout status daemonset kube-proxy -n kube-system
```

### For iptables Mode

Strict ARP is less critical with iptables mode since it doesn't configure service IPs on nodes the same way, but you can still configure it:

```yaml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "iptables"
iptables:
  strictARP: true
```

However, for optimal MetalLB compatibility, use IPVS mode with strict ARP.

### Using kubectl Patch (Automated Approach)

For automated deployments, patch the ConfigMap directly:

```bash
kubectl get configmap kube-proxy -n kube-system -o yaml | \
sed -e "s/strictARP: false/strictARP: true/" | \
kubectl apply -f - -n kube-system
```

Or use a more precise patch:

```bash
kubectl patch configmap kube-proxy -n kube-system --type merge -p '{"data":{"config.conf":"apiVersion: kubeproxy.config.k8s.io/v1alpha1\nkind: KubeProxyConfiguration\nmode: \"ipvs\"\nipvs:\n  strictARP: true\n  scheduler: \"rr\""}}'
```

## Verifying Strict ARP Configuration

After restarting kube-proxy, verify the settings took effect:

```bash
# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i "strict"

# On a node, check kernel parameters
ssh node1 "sysctl net.ipv4.conf.all.arp_announce"
ssh node1 "sysctl net.ipv4.conf.all.arp_ignore"
```

With strict ARP enabled, you should see:

```
net.ipv4.conf.all.arp_announce = 2
net.ipv4.conf.all.arp_ignore = 1
```

These values mean:
- `arp_announce = 2`: Always use the best local address for ARP requests
- `arp_ignore = 1`: Only reply to ARP requests for local addresses configured on the incoming interface

## Installing MetalLB with Strict ARP

Now that strict ARP is configured, install MetalLB:

```bash
# Install using manifest
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml

# Or using Helm
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace
```

Wait for MetalLB pods to start:

```bash
kubectl get pods -n metallb-system -w
```

## Configuring MetalLB Layer 2 Mode

Create an IP address pool for MetalLB to use:

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.240-192.168.1.250  # Your available IP range
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2-adv
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
```

Apply the configuration:

```bash
kubectl apply -f metallb-config.yaml
```

## Testing the Configuration

Create a test LoadBalancer service:

```yaml
# test-lb.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
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
  name: test-lb
spec:
  type: LoadBalancer
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f test-lb.yaml

# Check if an IP was assigned
kubectl get svc test-lb -w
```

You should see an external IP from your MetalLB pool:

```
NAME      TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
test-lb   LoadBalancer   10.96.100.50    192.168.1.240    80:32000/TCP   10s
```

## Verifying ARP Behavior

Check which node MetalLB selected for the service:

```bash
# View MetalLB speaker logs
kubectl logs -n metallb-system -l component=speaker | grep "192.168.1.240"
```

You should see a log indicating which node won the election and is announcing the IP.

From outside the cluster, verify ARP:

```bash
# From another machine on the same network
arp -a | grep 192.168.1.240
```

You should see exactly one MAC address for this IP, corresponding to the MetalLB speaker node.

Without strict ARP, you might see multiple nodes responding, causing unpredictable routing.

## Troubleshooting ARP Issues

If services aren't reachable:

### Check kube-proxy Mode

MetalLB L2 mode works best with IPVS:

```bash
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode
```

Should show `mode: "ipvs"`.

### Verify Strict ARP is Active

On each node:

```bash
sysctl net.ipv4.conf.all.arp_announce
sysctl net.ipv4.conf.all.arp_ignore
```

Both should be non-zero with strict ARP enabled.

### Check MetalLB Speaker Logs

```bash
kubectl logs -n metallb-system -l component=speaker -f
```

Look for errors about ARP announcements or leader election.

### Test ARP Responses

From a client machine:

```bash
# Clear ARP cache
sudo ip neigh flush all

# Ping the service IP
ping -c 1 192.168.1.240

# Check ARP table
arp -a | grep 192.168.1.240
```

You should see a single MAC address. If you see multiple or it keeps changing, strict ARP isn't working correctly.

### Use arping to Test

```bash
# From the client machine
sudo arping -I eth0 192.168.1.240
```

You should get replies from only one MAC address.

## Node-Level ARP Configuration

If kube-proxy isn't setting kernel parameters correctly, configure them manually on each node:

```bash
# On each node
cat <<EOF | sudo tee /etc/sysctl.d/99-metallb-strictarp.conf
net.ipv4.conf.all.arp_announce=2
net.ipv4.conf.all.arp_ignore=1
EOF

# Apply immediately
sudo sysctl -p /etc/sysctl.d/99-metallb-strictarp.conf
```

This ensures strict ARP persists across reboots even if kube-proxy fails to set it.

## Combining with ExternalTrafficPolicy

For better source IP preservation, use externalTrafficPolicy: Local:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-lb
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Add this
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 80
```

This ensures traffic entering through the MetalLB speaker node only goes to pods on that node, preserving the client's source IP and avoiding extra hops.

However, be aware this can cause uneven load distribution if pods aren't evenly spread across nodes.

## Monitoring MetalLB with Strict ARP

Monitor MetalLB's ARP announcement behavior:

```bash
# Count ARP announcements per service
kubectl logs -n metallb-system -l component=speaker | grep "announce" | sort | uniq -c

# Watch speaker logs in real-time
kubectl logs -n metallb-system -l component=speaker -f | grep -E "announce|leader"
```

Set up Prometheus monitoring for MetalLB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: metallb-speaker-metrics
  namespace: metallb-system
spec:
  selector:
    component: speaker
  ports:
  - port: 7472
    name: monitoring
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metallb-speaker
  namespace: metallb-system
spec:
  selector:
    matchLabels:
      component: speaker
  endpoints:
  - port: monitoring
    interval: 30s
```

Key metrics to watch:

- `metallb_speaker_announced`: Services announced by this speaker
- `metallb_allocator_addresses_in_use_total`: IP addresses currently allocated
- `metallb_k8s_client_updates_total`: Updates to Kubernetes resources

## BGP Mode Considerations

If using MetalLB in BGP mode instead of Layer 2, strict ARP is less critical because BGP doesn't rely on ARP for route advertisement. However, it's still good practice to enable it:

```yaml
# metallb-bgp-config.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: peer-1
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.1
```

With BGP, the upstream router learns about service IPs via BGP advertisements rather than ARP.

## Best Practices

When configuring strict ARP for MetalLB:

- Always use IPVS mode with MetalLB Layer 2
- Enable strict ARP before installing MetalLB
- Test with a single service first
- Monitor ARP behavior from external clients
- Use externalTrafficPolicy: Local for source IP preservation
- Configure sysctl parameters at the node level as backup
- Document the ARP configuration in your runbooks
- Test failover scenarios (node failures)
- Monitor MetalLB speaker logs for election changes
- Keep MetalLB and kube-proxy versions compatible

Strict ARP configuration is essential for reliable MetalLB operation in Layer 2 mode. Without it, you'll experience intermittent connectivity issues that are difficult to debug. With it properly configured, MetalLB provides cloud-like LoadBalancer services on bare-metal clusters.
