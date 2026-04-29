# How to Disable ServiceLB in K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, ServiceLB, MetalLB, Load Balancer

Description: Learn how to disable K3s's built-in ServiceLB (Klipper) and replace it with MetalLB or other load balancer solutions.

## Introduction

K3s includes ServiceLB (also known as Klipper LoadBalancer), which provides LoadBalancer-type Services by binding to host ports on cluster nodes. While this works out of the box, it has limitations: it only supports simple TCP/UDP forwarding, doesn't support advanced routing, and may conflict with bare metal load balancers. MetalLB is a popular replacement that provides a proper BGP or Layer 2 load balancer for on-premises Kubernetes clusters.

## What ServiceLB Does

ServiceLB works by creating a DaemonSet for each LoadBalancer Service. Each DaemonSet pod binds to the service port on each eligible node that has that port available. This means:
- The Service's external address list is populated with node IPs
- Traffic enters through those nodes and is forwarded to the Service's ClusterIP
- It works without any external infrastructure

## When to Replace ServiceLB

- You need proper VIP (Virtual IP) load balancing
- You have a BGP-capable network fabric
- You're using a hardware load balancer
- You want predictable external IPs that don't change with node IPs
- You need advanced L7 routing (use an ingress controller instead)

## Method 1: Disable Before Installation

```bash
# Create the config on every K3s server node
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
disable:
  - servicelb
EOF

# Install K3s

curl -sfL https://get.k3s.io | sudo sh -
```

## Method 2: Disable on an Existing Cluster

```bash
# Run this on every K3s server node
sudo mkdir -p /etc/rancher/k3s/config.yaml.d

sudo tee /etc/rancher/k3s/config.yaml.d/10-disable-servicelb.yaml > /dev/null <<EOF
disable+:
  - servicelb
EOF

# Restart K3s on each server node
sudo systemctl restart k3s

# Verify ServiceLB pods are gone
kubectl get pods -n kube-system | grep svclb
# Should return empty
```

## Verifying ServiceLB is Removed

```bash
# Check no svclb DaemonSets exist
kubectl get daemonsets -n kube-system | grep svclb

# Before installing another load balancer, LoadBalancer Services should stay pending
kubectl get svc -A
# Any Service of type LoadBalancer should show EXTERNAL-IP as <pending>
```

## Installing MetalLB

MetalLB is the most popular bare-metal load balancer for Kubernetes:

### Installation

```bash
# Install MetalLB using the official manifests
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready
kubectl -n metallb-system rollout status deployment/controller
kubectl -n metallb-system rollout status daemonset/speaker

# Verify MetalLB pods are running
kubectl -n metallb-system get pods
```

### Configure Layer 2 Mode (Simple Setup)

Layer 2 mode is the easiest to configure and works well on bare-metal Ethernet networks:

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production
  namespace: metallb-system
spec:
  # Assign IPs from this range to LoadBalancer Services
  addresses:
    - 192.168.1.200-192.168.1.250
  # Auto-assign from this pool
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: production
  namespace: metallb-system
spec:
  ipAddressPools:
    - production
```

```bash
kubectl apply -f metallb-config.yaml

# Wait a moment, then test a LoadBalancer service
kubectl create deployment my-app --image=nginx
kubectl expose deployment my-app --type=LoadBalancer --port=80

# Check if MetalLB assigned an external IP
kubectl get svc my-app
# EXTERNAL-IP should show an IP from 192.168.1.200-250
```

### Configure BGP Mode (Advanced)

BGP mode integrates with your network fabric for full routing:

```yaml
# metallb-bgp-config.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: my-router
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64500
  peerAddress: 192.168.1.1    # Your BGP router IP
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.0/24
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

## Testing the Load Balancer

```bash
# Deploy a test application
kubectl create deployment lb-test --image=nginx --replicas=2

# Create a LoadBalancer service
kubectl expose deployment lb-test --type=LoadBalancer --port=80

# Wait for MetalLB to assign an IP
kubectl get svc lb-test -w

# Once the EXTERNAL-IP is assigned
LB_IP=$(kubectl get svc lb-test -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Load balancer IP: $LB_IP"

# Test
curl http://$LB_IP

# Clean up
kubectl delete deployment lb-test
kubectl delete svc lb-test
```

## Annotations for MetalLB

```yaml
# Control MetalLB behavior with Service annotations
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    # Use a specific IP address
    metallb.io/loadBalancerIPs: "192.168.1.200"
    # Use a specific address pool
    metallb.io/address-pool: production
    # Enable IP sharing (for multiple services on the same IP, different ports)
    metallb.io/allow-shared-ip: "key-to-share"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

## Cloud Provider Load Balancers

If you're running K3s on a cloud provider, disable ServiceLB and use the cloud's native LB instead:

```bash
# For AWS, install the AWS Load Balancer Controller
# Disable ServiceLB first on every K3s server node
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/10-disable-servicelb.yaml > /dev/null <<EOF
disable+:
  - servicelb
EOF
sudo systemctl restart k3s

# Prerequisites: attach the required IAM permissions and ensure subnets are tagged for auto-discovery
# Then deploy your cloud LB controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=my-k3s-cluster
```

## Conclusion

Disabling ServiceLB in K3s and replacing it with MetalLB gives you a production-grade load balancer that properly handles IP address assignment and network announcements. MetalLB's Layer 2 mode is straightforward to set up on bare-metal Ethernet networks, while BGP mode provides full integration with enterprise network fabrics. The transition is simple - disable ServiceLB in the K3s config, restart K3s, deploy MetalLB, and configure IP address pools. Existing LoadBalancer Services will automatically receive IPs from MetalLB's pool.
