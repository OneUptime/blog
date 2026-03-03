# How to Configure kube-vip on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, kube-vip, Virtual IP, High Availability, Kubernetes, Load Balancing

Description: Deploy and configure kube-vip on Talos Linux for a highly available control plane VIP and LoadBalancer service support.

---

kube-vip is a lightweight tool that provides virtual IP (VIP) addresses for Kubernetes clusters. On Talos Linux, it serves two important roles: providing a highly available VIP for the control plane API server, and optionally acting as a service load balancer similar to MetalLB. It is particularly popular in the Talos community because it runs as a static pod and integrates cleanly with the Talos machine configuration.

This guide covers both use cases: control plane VIP and service load balancing.

## Understanding kube-vip

kube-vip uses leader election to assign a virtual IP to one node at a time. The leader node binds the VIP to its network interface and responds to ARP requests for it. If the leader fails, another node wins the election and takes over the VIP. This provides seamless failover with minimal downtime (typically under a second).

For LoadBalancer services, kube-vip watches the Kubernetes API for services of type LoadBalancer and assigns IPs from a configured range, similar to what MetalLB does in L2 mode.

## Control Plane VIP with Talos Linux

The most common use of kube-vip on Talos is providing a single stable IP for the Kubernetes API server. Instead of pointing kubectl at a specific control plane node (which would be a single point of failure), you point it at the VIP.

Talos Linux has built-in VIP support that works similarly to kube-vip. You can configure it directly in the machine configuration:

```yaml
# talos-controlplane.yaml
machine:
  network:
    interfaces:
    - interface: eth0
      dhcp: true
      vip:
        ip: 192.168.1.100  # The VIP for the control plane
```

However, if you prefer kube-vip for additional features or for LoadBalancer service support, you can deploy it as a static pod.

## Deploying kube-vip as a Static Pod

On Talos Linux, static pods are defined in the machine configuration. Add kube-vip as an extra manifest:

```yaml
# talos-kube-vip-patch.yaml
cluster:
  extraManifests:
  - https://kube-vip.io/manifests/rbac.yaml
  inlineManifests:
  - name: kube-vip
    contents: |
      apiVersion: apps/v1
      kind: DaemonSet
      metadata:
        name: kube-vip
        namespace: kube-system
        labels:
          app.kubernetes.io/name: kube-vip
      spec:
        selector:
          matchLabels:
            app.kubernetes.io/name: kube-vip
        template:
          metadata:
            labels:
              app.kubernetes.io/name: kube-vip
          spec:
            containers:
            - name: kube-vip
              image: ghcr.io/kube-vip/kube-vip:v0.7.2
              args:
              - manager
              env:
              - name: vip_arp
                value: "true"
              - name: port
                value: "6443"
              - name: vip_interface
                value: eth0
              - name: vip_cidr
                value: "32"
              - name: cp_enable
                value: "true"
              - name: cp_namespace
                value: kube-system
              - name: vip_ddns
                value: "false"
              - name: svc_enable
                value: "true"
              - name: svc_leasename
                value: plndr-svcs-lock
              - name: vip_leaderelection
                value: "true"
              - name: vip_leasename
                value: plndr-cp-lock
              - name: vip_leaseduration
                value: "5"
              - name: vip_renewdeadline
                value: "3"
              - name: vip_retryperiod
                value: "1"
              - name: address
                value: "192.168.1.100"
              - name: prometheus_server
                value: :2112
              securityContext:
                capabilities:
                  add:
                  - NET_ADMIN
                  - NET_RAW
            hostNetwork: true
            tolerations:
            - effect: NoSchedule
              operator: Exists
            - effect: NoExecute
              operator: Exists
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: node-role.kubernetes.io/control-plane
                      operator: Exists
            serviceAccountName: kube-vip
```

Apply the configuration to your control plane nodes:

```bash
talosctl patch machineconfig --nodes 10.0.0.10,10.0.0.11,10.0.0.12 \
    --patch-file talos-kube-vip-patch.yaml
```

## Enabling Service Load Balancing

To use kube-vip as a LoadBalancer provider (instead of or alongside MetalLB), configure the service IP range using a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  cidr-global: "192.168.1.200/27"  # Service IP range
```

Or use address ranges:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  range-global: "192.168.1.200-192.168.1.230"
```

Make sure the kube-vip DaemonSet has `svc_enable` set to `true` in its environment variables (as shown in the DaemonSet manifest above).

## Deploying kube-vip Cloud Provider

For better LoadBalancer integration, deploy the kube-vip cloud provider:

```bash
kubectl apply -f https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml
```

The cloud provider watches for LoadBalancer services and manages IP assignment from your configured ranges.

```yaml
# Configure IP ranges per namespace
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  # Global range used when no namespace-specific range matches
  cidr-global: "192.168.1.200/27"

  # Namespace-specific ranges
  cidr-production: "192.168.1.200-192.168.1.210"
  cidr-staging: "192.168.1.220-192.168.1.225"
```

## Testing the VIP

Verify that the control plane VIP is working:

```bash
# Check VIP assignment
kubectl get lease -n kube-system | grep plndr

# Test API server through the VIP
kubectl --server=https://192.168.1.100:6443 get nodes

# Check which node currently holds the VIP
kubectl get events -n kube-system | grep kube-vip

# Verify ARP
arping -c 3 192.168.1.100
```

Test LoadBalancer service:

```bash
# Create a test service
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --type=LoadBalancer --port=80

# Check the assigned IP
kubectl get svc nginx
# NAME    TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)        AGE
# nginx   LoadBalancer   10.96.1.50    192.168.1.200   80:31234/TCP   10s

# Test access
curl http://192.168.1.200
```

## Tuning Leader Election

Faster leader election means faster failover, but more aggressive settings increase API server load:

```yaml
# Environment variables for kube-vip
- name: vip_leaseduration
  value: "5"        # How long a lease is valid (seconds)
- name: vip_renewdeadline
  value: "3"        # How long the leader tries to renew before giving up
- name: vip_retryperiod
  value: "1"        # How often non-leaders check for a new election
```

For production Talos clusters, the defaults (5/3/1) provide a good balance. If you need faster failover and your API server can handle the load, reduce these values. For larger clusters where API server load is a concern, increase them.

## kube-vip vs MetalLB

Both tools provide LoadBalancer service support. Here is when to choose each:

```text
kube-vip:
- Built-in control plane VIP (one tool for both needs)
- Simpler setup (single DaemonSet)
- Uses leader election per service (one node handles each IP)
- Good for small to medium clusters

MetalLB:
- No control plane VIP support
- L2 and BGP modes available
- BGP mode provides true ECMP load balancing
- Better for large clusters or complex network setups
- More mature ecosystem and community
```

You can also run both: use kube-vip for the control plane VIP and MetalLB for LoadBalancer services. Just make sure their IP ranges do not overlap.

## Monitoring kube-vip

kube-vip exposes Prometheus metrics on port 2112:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-vip
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      app.kubernetes.io/name: kube-vip
  endpoints:
  - port: prometheus
    interval: 15s
```

Set up alerts for VIP failover:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kube-vip-alerts
  namespace: monitoring
spec:
  groups:
  - name: kube-vip
    rules:
    - alert: KubeVipLeaderChanged
      expr: |
        changes(kube_vip_leader_is_leader[5m]) > 2
      labels:
        severity: warning
      annotations:
        summary: "kube-vip leadership changing frequently"
        description: "The VIP leader has changed more than twice in 5 minutes"
```

## Troubleshooting kube-vip on Talos

```bash
# Check kube-vip logs
kubectl logs -n kube-system -l app.kubernetes.io/name=kube-vip --tail=50

# Verify the lease
kubectl get lease plndr-cp-lock -n kube-system -o yaml

# Check if the VIP is bound to an interface
talosctl get addresses --nodes $NODE_IP | grep 192.168.1.100

# Test connectivity to the VIP
ping -c 3 192.168.1.100

# If VIP is not responding, check capabilities
kubectl get pods -n kube-system -l app.kubernetes.io/name=kube-vip -o yaml | grep -A5 capabilities
```

## Wrapping Up

kube-vip on Talos Linux provides a clean, lightweight solution for both control plane high availability and LoadBalancer service support. Its integration through the Talos machine configuration makes it easy to deploy and manage. For simple bare-metal setups, kube-vip can serve as your only load balancing solution. For more complex needs, pair it with MetalLB for the best of both worlds. Start with the control plane VIP to get your cluster highly available, then enable service load balancing as your needs grow.
