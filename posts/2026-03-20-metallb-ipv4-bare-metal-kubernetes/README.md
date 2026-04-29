# How to Configure MetalLB for IPv4 Load Balancing in Bare-Metal Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MetalLB, Kubernetes, IPv4, Load Balancing, Bare Metal, Networking

Description: Install MetalLB on a bare-metal Kubernetes cluster and configure an IPv4 address pool so LoadBalancer-type services receive external IPs.

On cloud providers, `LoadBalancer` services automatically get external IPs. On bare metal, MetalLB implements this functionality by advertising service IPs via ARP (Layer 2) or BGP (Layer 3).

## Step 1: Install MetalLB

If your cluster uses `kube-proxy` in IPVS mode, enable `strictARP: true` in the `kube-proxy` configuration before installing MetalLB. Also ensure TCP and UDP port `7946` are allowed between cluster nodes for MetalLB's memberlist traffic.

```bash
# Install MetalLB using the official manifest

kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s

# Verify installation
kubectl get pods -n metallb-system
# Expected:
# controller-xxx   1/1   Running
# speaker-xxx      1/1   Running   (one per node)
```

## Step 2: Configure an IPv4 Address Pool

Create an `IPAddressPool` resource with the IP range MetalLB can assign to services:

```yaml
# metallb-ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
  # Range of IPs MetalLB can assign to LoadBalancer services
  # These must be usable on your local network and not already in use
  - 192.168.1.200-192.168.1.250

  # Alternatively, specify a CIDR-aligned subnet:
  # - 192.168.1.240/28

  # Allow automatic assignment from this pool
  autoAssign: true
```

```bash
kubectl apply -f metallb-ippool.yaml
```

## Step 3: Configure L2 Advertisement (Layer 2 Mode)

L2 mode uses ARP to respond to requests for MetalLB-assigned IPs:

```yaml
# metallb-l2-advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advertisement
  namespace: metallb-system
spec:
  # Reference the IP pool to advertise
  ipAddressPools:
  - production-pool

  # Optional: restrict advertisement to specific nodes
  # nodeSelectors:
  # - matchLabels:
  #     node-role: edge
```

```bash
kubectl apply -f metallb-l2-advertisement.yaml
```

## Step 4: Create a LoadBalancer Service

This example assumes Pods labeled `app: my-web-app` are already running and listening on port `8080`.

```yaml
# my-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-service
  namespace: default
spec:
  selector:
    app: my-web-app
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

```bash
kubectl apply -f my-service.yaml

# Watch the service get an external IP assigned
kubectl get svc my-web-service -w
# NAME             TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)
# my-web-service   LoadBalancer   10.96.45.123   192.168.1.200     80:31234/TCP
```

## Verifying MetalLB is Working

```bash
# Check the external IP is reachable
curl http://192.168.1.200

# Verify MetalLB is announcing the service
kubectl describe svc my-web-service
# Events should show which node is announcing the IP

# Verify the IP answers ARP requests on the local network
arping -I <interface> 192.168.1.200
# Should return replies with the MAC address of a Kubernetes node

# Check recent MetalLB speaker logs if you need to troubleshoot further
kubectl logs -n metallb-system -l component=speaker --tail=20
```

In L2 mode, one node announces each external IP and answers ARP requests for it. If that node fails, MetalLB automatically moves the IP to another node.
