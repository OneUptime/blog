# How to Configure MetalLB with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, MetalLB, Load Balancing

Description: A step-by-step guide to installing and configuring MetalLB in Rancher for LoadBalancer services on bare-metal Kubernetes clusters.

MetalLB provides a network load balancer implementation for bare-metal Kubernetes clusters. Without MetalLB, clusters running outside of cloud providers cannot use LoadBalancer service types, as there is no external load balancer to provision. This guide shows how to set up MetalLB in a Rancher-managed cluster.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A bare-metal or on-premises Kubernetes cluster managed by Rancher
- A pool of IP addresses available for MetalLB to assign
- kubectl access to your cluster
- Helm installed

## Understanding MetalLB

MetalLB operates in two modes:

- **Layer 2 mode**: One node in the cluster claims the IP address using ARP/NDP. Simple to configure but limited to a single node handling traffic for each IP.
- **BGP mode**: The cluster peers with network routers via BGP to advertise allocated IP addresses. More scalable and provides true load balancing.

## Step 1: Prepare the Cluster

If your cluster uses kube-proxy in IPVS mode, enable strict ARP:

```bash
kubectl get configmap kube-proxy -n kube-system -o yaml | \
  sed -e "s/strictARP: false/strictARP: true/" | \
  kubectl apply -f - -n kube-system
```

## Step 2: Install MetalLB via Helm

```bash
helm repo add metallb https://metallb.github.io/metallb
helm repo update

helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace
```

Wait for the pods to be ready:

```bash
kubectl get pods -n metallb-system -w
```

## Step 3: Alternatively, Install via Rancher Apps

If you prefer to install MetalLB from the Rancher UI instead of the Helm CLI, add the MetalLB chart repository and install the chart there. In older Rancher 2.6 releases, the **Apps** area is labeled **Apps & Marketplace**.

1. Navigate to your cluster in the Rancher dashboard.
2. Go to **Apps** > **Repositories** and add the Helm chart repository `https://metallb.github.io/metallb`.
3. Go to **Apps** > **Charts**.
4. Search for **MetalLB**.
5. Click **Install**.
6. Select namespace `metallb-system`.
7. Configure values as needed.
8. Click **Install**.

## Step 4: Configure Layer 2 Mode

Create an IP address pool and L2 advertisement:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
```

```bash
kubectl apply -f metallb-config.yaml
```

## Step 5: Configure BGP Mode

For BGP mode, configure a peer and advertisement:

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-peer
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 10.0.0.1
  holdTime: 90s
  keepaliveTime: 30s
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
  - 203.0.113.0/24
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: bgp-adv
  namespace: metallb-system
spec:
  ipAddressPools:
  - bgp-pool
  aggregationLength: 32
```

## Step 6: Create Multiple IP Pools

Separate pools for different environments:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.220
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: staging-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.221-192.168.1.240
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-adv
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
  - staging-pool
```

## Step 7: Create a LoadBalancer Service

Now you can create LoadBalancer services that get real external IPs:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl apply -f web-app-lb.yaml
kubectl get svc web-app-lb -w
```

MetalLB will assign an IP from your configured pool.

## Step 8: Request a Specific IP

Assign a specific IP address from the pool:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-static
  namespace: default
  annotations:
    metallb.io/loadBalancerIPs: "192.168.1.200"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

## Step 9: Assign Services to Specific Pools

Use annotations to select which pool a service should use:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: staging-app
  namespace: staging
  annotations:
    metallb.io/address-pool: staging-pool
spec:
  type: LoadBalancer
  selector:
    app: staging-app
  ports:
  - port: 80
    targetPort: 8080
```

## Step 10: Verify and Monitor MetalLB

Check MetalLB status:

```bash
# View controller and speaker pods

kubectl get pods -n metallb-system

# Check assigned IPs
kubectl get svc --all-namespaces | grep LoadBalancer

# View MetalLB logs
kubectl logs -n metallb-system -l app.kubernetes.io/component=controller
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker

# Check IP address pool usage
kubectl get ipaddresspool -n metallb-system -o yaml
```

Test connectivity:

```bash
curl http://192.168.1.200/
```

## Troubleshooting

- **Service stuck in Pending**: Check that the IP pool has available addresses
- **No external IP assigned**: Verify MetalLB pods are running and IP pools are configured
- **ARP issues in Layer 2**: Ensure strictARP is enabled for IPVS mode
- **BGP not peering**: Check firewall rules and BGP peer configuration
- **IP conflicts**: Ensure MetalLB IP ranges do not overlap with DHCP or other allocated ranges

## Summary

MetalLB brings LoadBalancer service functionality to bare-metal Kubernetes clusters managed by Rancher. Layer 2 mode provides a simple setup for smaller environments, while BGP mode offers true load balancing and scalability for production deployments. By configuring IP address pools and advertisements, you can manage external IP allocation across different environments and teams.
