# How to Set Up MetalLB as LoadBalancer in K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, MetalLB, Load Balancing, Networking, Bare Metal

Description: Learn how to deploy MetalLB in K3s to provide LoadBalancer service support on bare-metal and on-premise clusters without a cloud provider.

## Introduction

Kubernetes `LoadBalancer` services normally require a cloud provider (AWS, GCP, Azure) to provision external load balancers. On bare-metal Kubernetes clusters, services of type `LoadBalancer` remain in a pending state indefinitely without this support. K3s includes a built-in ServiceLB, but **MetalLB** provides a more flexible bare-metal load balancer using either ARP/NDP (Layer 2) or BGP (Layer 3) protocols.

## Prerequisites

- K3s cluster on bare-metal or VMs without a cloud provider
- A pool of IP addresses available for MetalLB to assign
- No other load balancer solution running (disable K3s's built-in ServiceLB/klipper-lb)

## Step 1: Disable K3s's Built-in ServiceLB

K3s ships with a simple built-in load balancer (klipper-lb/ServiceLB). Disable it before installing MetalLB:

```bash
# If installing fresh

curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--disable servicelb" \
  sh -

# Or add to existing config on all K3s server nodes
# /etc/rancher/k3s/config.yaml
# disable:
#   - servicelb

# Restart K3s after changing the config
# sudo systemctl restart k3s

# Verify klipper-lb pods are not running
kubectl get pods -A | grep svclb
```

## Step 2: If Using kube-proxy in IPVS Mode, Enable Strict ARP Mode

If your cluster is using kube-proxy in IPVS mode, enable strict ARP before installing MetalLB. This is not required for other kube-proxy modes:

```bash
# Check current configuration
kubectl get configmap kube-proxy -n kube-system -o yaml | \
  grep -A 5 ipvs

# Enable strict ARP
kubectl get configmap kube-proxy -n kube-system -o yaml | \
  sed -e "s/strictARP: false/strictARP: true/" | \
  kubectl apply -f - -n kube-system
```

## Step 3: Install MetalLB

Using Helm (recommended):

```bash
# Add MetalLB Helm repository
helm repo add metallb https://metallb.github.io/metallb
helm repo update

# Install MetalLB
helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace \
  --wait

# Verify MetalLB is running
kubectl get pods -n metallb-system
```

Or via K3s auto-deploy manifests:

```yaml
# /var/lib/rancher/k3s/server/manifests/metallb.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: metallb
  namespace: kube-system
spec:
  repo: https://metallb.github.io/metallb
  chart: metallb
  targetNamespace: metallb-system
  createNamespace: true
```

## Step 4: Configure MetalLB IP Address Pool

Define the pool of IP addresses MetalLB can assign to LoadBalancer services:

### Layer 2 Mode (Recommended for Most Use Cases)

```yaml
# metallb-config.yaml
---
# Define the IP address pool
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    # Range of IPs available for LoadBalancer services
    # Must be on the same network as your nodes
    - 192.168.1.200-192.168.1.250
    # Or use CIDR notation
    # - 192.168.1.200/28

---
# Configure Layer 2 advertisement
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2-advertisement
  namespace: metallb-system
spec:
  # Associate with the IP pool
  ipAddressPools:
    - default-pool
  # Optional: specify which nodes can advertise
  # nodeSelectors:
  #   - matchLabels:
  #       kubernetes.io/hostname: node1
```

Apply the configuration:

```bash
kubectl apply -f metallb-config.yaml

# Verify the pool is configured
kubectl get ipaddresspool -n metallb-system
kubectl get l2advertisement -n metallb-system
```

### BGP Mode (For Advanced Network Environments)

```yaml
# metallb-bgp-config.yaml
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
    - 203.0.113.0/28  # Example range; replace with addresses from your network

---
# BGP configuration
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-peer
  namespace: metallb-system
spec:
  peerAddress: 192.168.1.1  # Your router/BGP peer IP
  peerASN: 64512            # Peer AS number
  myASN: 64513              # Your cluster's AS number

---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: bgp-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - bgp-pool
```

## Step 5: Test MetalLB with a LoadBalancer Service

Deploy a test application with a LoadBalancer service:

```yaml
# test-loadbalancer.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-lb-test
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-lb-test
  template:
    metadata:
      labels:
        app: nginx-lb-test
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-lb-test-svc
  namespace: default
  # Optional: request a specific IP from the pool
  # annotations:
  #   metallb.io/loadBalancerIPs: 192.168.1.200
spec:
  type: LoadBalancer
  selector:
    app: nginx-lb-test
  ports:
    - port: 80
      targetPort: 80
```

Apply and verify:

```bash
kubectl apply -f test-loadbalancer.yaml

# Watch for the EXTERNAL-IP to be assigned by MetalLB
kubectl get svc nginx-lb-test-svc -w

# The EXTERNAL-IP should be assigned from your pool:
# NAME               TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)        AGE
# nginx-lb-test-svc  LoadBalancer   10.43.123.45   192.168.1.200   80:32100/TCP   30s

# Test access from outside the cluster
curl http://192.168.1.200/
```

## Step 6: Assign Services to Specific Pools

When you have multiple IP pools:

```yaml
# Production pool for external traffic
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.210
---
# Internal pool for internal services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: internal-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.200-10.0.0.220
```

Assign a service to a specific pool:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  annotations:
    # Request IP from the internal pool
    metallb.io/address-pool: internal-pool
spec:
  type: LoadBalancer
  # ...
```

## Conclusion

MetalLB transforms K3s into a production-ready platform for bare-metal and on-premise deployments by providing proper LoadBalancer support. Layer 2 mode works out of the box for most environments with minimal configuration, while BGP mode offers more advanced networking options for data center deployments. Combined with K3s's simplicity, MetalLB makes bare-metal Kubernetes clusters fully functional without cloud infrastructure dependencies.
