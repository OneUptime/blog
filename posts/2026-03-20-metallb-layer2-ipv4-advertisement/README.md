# How to Configure MetalLB Layer 2 Mode for IPv4 Address Advertisement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MetalLB, Kubernetes, IPv4, Layer 2, ARP, Networking

Description: Configure MetalLB's Layer 2 mode to advertise IPv4 service addresses via ARP on bare-metal Kubernetes clusters without requiring BGP routing infrastructure.

MetalLB Layer 2 mode is the simplest deployment model. One node responds to ARP requests for each external IP, acting as the network entry point for that IP. This requires no special switch or router configuration.

## How Layer 2 Mode Works

```text
External Client → ARP request for 192.168.1.200?
MetalLB Speaker → I have 192.168.1.200 (replies with node MAC)
External Client → Sends traffic to that node
Kubernetes → Forwards to service pods (any node)
```

One node per IP is the "leader" for ARP. If that node fails, MetalLB chooses a new leader and sends unsolicited layer 2 packets so clients can update the MAC address associated with that IP.

## Prerequisites

```bash
# Verify MetalLB is installed

kubectl get pods -n metallb-system

# The IP range must be in the same L2 network as your nodes
# (cannot span L3 boundaries without BGP)
```

## Step 1: Create the IP Address Pool

```yaml
# metallb-l2-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: l2-pool
  namespace: metallb-system
spec:
  addresses:
  # Must be routable IPs on the same L2 network as your nodes
  # Check your node IP range: kubectl get nodes -o wide
  - 192.168.1.200-192.168.1.250

  # Set to false if you want explicit annotation for assignment
  autoAssign: true
```

```bash
kubectl apply -f metallb-l2-pool.yaml
```

## Step 2: Create L2 Advertisement

```yaml
# metallb-l2advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  # Which pools to advertise via L2
  ipAddressPools:
  - l2-pool

  # Optional: only advertise from specific nodes (e.g., nodes on the external network)
  nodeSelectors:
  - matchLabels:
      kubernetes.io/os: linux

  # Optional: only advertise on specific interfaces
  interfaces:
  - eth0
```

```bash
kubectl apply -f metallb-l2advertisement.yaml
```

## Step 3: Verify L2 Advertisement

```bash
# Create a test service
kubectl create deployment test-app --image=nginx --replicas=2 --port=80
kubectl expose deployment test-app --type=LoadBalancer --port=80 --target-port=80

# Wait for IP assignment
kubectl get svc test-app -w
# test-app   LoadBalancer   10.96.x.x   192.168.1.200   80:30xxx/TCP

# Verify ARP works from a machine on the same network
arping -I <interface> 192.168.1.200
# Should return unicast replies from the MAC address of the announcing node

# Verify the service itself over TCP
curl http://192.168.1.200
```

## Monitoring L2 Advertisement

```bash
# View which node is announcing each LoadBalancer service in L2 mode
kubectl get servicel2statuses -n metallb-system

# Check the service events for the announcing node
kubectl describe svc test-app

# Check recent speaker logs
kubectl logs -n metallb-system daemonset/speaker --all-pods=true --since=10m --prefix
```

## Limitations of L2 Mode

- **Single point of ingress**: all external traffic for an IP enters via one node
- **Same L2 network required**: the external IPs must be on the same local network segment as the announcing nodes
- **Failover depends on client ARP cache updates**: modern OSes usually converge within a few seconds, but buggy clients can take longer

For production deployments with large traffic volumes or multi-subnet topologies, consider MetalLB BGP mode instead.
