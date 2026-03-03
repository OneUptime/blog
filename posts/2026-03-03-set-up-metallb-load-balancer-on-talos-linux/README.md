# How to Set Up MetalLB Load Balancer on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MetalLB, Load Balancer, Kubernetes, Bare Metal, Networking

Description: Deploy and configure MetalLB on Talos Linux to provide LoadBalancer services on bare-metal Kubernetes clusters without a cloud provider.

---

When you run Kubernetes on a cloud provider, creating a Service of type LoadBalancer automatically provisions an external load balancer. On bare-metal Talos Linux clusters, that magic does not happen. Services of type LoadBalancer sit in a "Pending" state forever because there is no cloud controller to provision an external IP. MetalLB solves this problem by providing a network load balancer implementation for bare-metal clusters.

This guide covers installing and configuring MetalLB on Talos Linux from scratch.

## What MetalLB Does

MetalLB has two main functions:

1. Address allocation - it assigns external IP addresses to LoadBalancer services from a pool you define
2. External announcement - it makes those IPs reachable from outside the cluster, using either Layer 2 (ARP/NDP) or BGP protocols

In Layer 2 mode, MetalLB responds to ARP requests for the service IP, directing traffic to a single node that then routes it to the correct pod. In BGP mode, MetalLB peers with your network routers and advertises routes to the service IPs, which enables true load balancing across nodes.

## Prerequisites

Before installing MetalLB on Talos Linux, you need:

- A range of IP addresses on your network that are not in use (for L2 mode) or allocated to your AS (for BGP mode)
- Talos Linux cluster running with kubectl access
- If using kube-proxy in IPVS mode, you need to enable strict ARP

Check your kube-proxy mode:

```bash
# Check kube-proxy mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode
```

If you are using IPVS mode, enable strict ARP through the Talos machine configuration:

```yaml
# talos-proxy-patch.yaml
cluster:
  proxy:
    extraArgs:
      ipvs-strict-arp: "true"
```

Apply it:

```bash
talosctl patch machineconfig --nodes $CP_NODES --patch-file talos-proxy-patch.yaml
```

## Installing MetalLB

Install MetalLB using Helm:

```bash
# Add the MetalLB Helm repository
helm repo add metallb https://metallb.github.io/metallb
helm repo update

# Create the namespace
kubectl create namespace metallb-system

# Install MetalLB
helm install metallb metallb/metallb \
    --namespace metallb-system \
    --wait
```

Verify the installation:

```bash
# Check that MetalLB pods are running
kubectl get pods -n metallb-system

# You should see:
# - metallb-controller (Deployment)
# - metallb-speaker (DaemonSet, one per node)
```

Wait for the controller and speaker pods to be ready before configuring address pools.

## Configuring IP Address Pools

MetalLB needs to know which IP addresses it can hand out. Define an IPAddressPool:

```yaml
# ip-address-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.250  # Range of IPs on your network
```

Apply it:

```bash
kubectl apply -f ip-address-pool.yaml
```

You can also use CIDR notation:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.0.0.200/28  # 10.0.0.200 through 10.0.0.215
  autoAssign: true  # Automatically assign IPs from this pool
```

Multiple pools for different purposes:

```yaml
# Production pool - manually assigned IPs for critical services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.210
  autoAssign: false  # Only assign when explicitly requested
---
# General pool - auto-assigned for all other services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: general
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.220-192.168.1.250
  autoAssign: true
```

## Configuring L2 Advertisement

For Layer 2 mode, create an L2Advertisement resource:

```yaml
# l2-advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
```

Apply it:

```bash
kubectl apply -f l2-advertisement.yaml
```

That is all it takes for basic L2 mode. MetalLB will now respond to ARP requests for any IP in the pool.

## Creating a LoadBalancer Service

Now create a service of type LoadBalancer and MetalLB will assign it an IP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web-app
```

Check the assigned IP:

```bash
# See the external IP assigned by MetalLB
kubectl get svc web-app -n production

# Output:
# NAME      TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)        AGE
# web-app   LoadBalancer   10.96.1.50    192.168.1.200   80:31234/TCP   5s
```

Test access from outside the cluster:

```bash
curl http://192.168.1.200
```

## Requesting a Specific IP

You can request a specific IP address:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: critical-app
  namespace: production
  annotations:
    metallb.universe.tf/address-pool: production  # Use the production pool
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.201  # Request this specific IP
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: critical-app
```

## Sharing an IP Between Services

MetalLB allows multiple services to share the same external IP if they use different ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: http-service
  annotations:
    metallb.universe.tf/allow-shared-ip: "shared-web"
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
---
apiVersion: v1
kind: Service
metadata:
  name: https-service
  annotations:
    metallb.universe.tf/allow-shared-ip: "shared-web"
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: web
```

The `allow-shared-ip` annotation must have the same value for both services.

## Monitoring MetalLB

MetalLB exposes Prometheus metrics:

```bash
# Check MetalLB speaker metrics
kubectl port-forward -n metallb-system daemonset/metallb-speaker 7472:7472 &
curl -s http://localhost:7472/metrics | grep metallb

# Key metrics:
# metallb_allocator_addresses_in_use_total - IPs currently assigned
# metallb_allocator_addresses_total - Total IPs available
# metallb_layer2_requests_received - L2 requests handled
```

## Troubleshooting MetalLB on Talos

Common issues and their solutions:

```bash
# Issue: Service stuck in Pending state
# Check if address pools are configured
kubectl get ipaddresspools -n metallb-system

# Check MetalLB controller logs
kubectl logs -n metallb-system -l app.kubernetes.io/component=controller --tail=50

# Issue: External IP assigned but not reachable
# Check speaker logs for ARP issues
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=50

# Verify ARP is working (from a machine on the same network)
arping 192.168.1.200

# Issue: Failover not working
# Check which node is handling the IP
kubectl get events -n metallb-system --sort-by=.lastTimestamp

# Check the speaker status on each node
kubectl exec -n metallb-system -it $(kubectl get pod -n metallb-system -l app.kubernetes.io/component=speaker -o jsonpath='{.items[0].metadata.name}') -- speaker --help
```

## Talos-Specific Considerations

On Talos Linux, there are a few things to keep in mind:

1. Talos does not run a traditional firewall, so MetalLB's ARP responses are not blocked by iptables rules
2. Make sure your IP pool does not conflict with the Talos node IPs or the Kubernetes service CIDR
3. If you are using Cilium as your CNI on Talos, MetalLB works well alongside it in L2 mode

```bash
# Verify there are no IP conflicts
# Check node IPs
kubectl get nodes -o wide

# Check service CIDR
kubectl cluster-info dump | grep -i service-cluster-ip-range
```

## Wrapping Up

MetalLB fills a critical gap for bare-metal Talos Linux clusters by providing LoadBalancer service support. Layer 2 mode is the easiest to set up and works well for most environments. For larger deployments or environments with proper routing infrastructure, BGP mode offers better load distribution and faster failover. Start with L2, define your IP pools carefully to avoid conflicts, and you will have working LoadBalancer services in minutes.
