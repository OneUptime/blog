# How to Deploy MetalLB Load Balancer for Bare-Metal Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Load Balancing, Kubernetes, Container, MetalLB, Bare Metal, Linux

Description: Learn how to deploy MetalLB Load Balancer for Bare-Metal Kubernetes on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Deploy MetalLB Load Balancer for Bare-Metal Kubernetes on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation on your Kubernetes nodes
- A working Kubernetes cluster and a configured `kubectl` client
- An unused IP address range on the same Layer 2 network as your worker nodes
- Root or sudo access
- A stable network connection

## Overview

Deploying MetalLB Load Balancer for Bare-Metal Kubernetes requires careful planning and execution. This guide walks through the complete process from installation to verification using MetalLB Layer 2 mode.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl ca-certificates
kubectl cluster-info
```

## Step 2: Install Required Packages

Install MetalLB in the Kubernetes cluster by applying the upstream manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
```

Verify the installation:

```bash
kubectl get pods -n metallb-system
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=120s
```

## Step 3: Configure the Service

Create the MetalLB address pool and Layer 2 advertisement. Replace the address range with unused IPs from your local network:

```bash
cat <<'EOF' | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.240-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
spec:
  ipAddressPools:
  - first-pool
EOF
```

Apply the recommended settings for your environment. The address pool must not overlap with DHCP leases or any statically assigned hosts.

## Step 4: Start and Enable the Service

MetalLB runs as Kubernetes workloads, not as a RHEL systemd service. Confirm that the controller Deployment and speaker DaemonSet are running:

```bash
kubectl get deployment controller -n metallb-system
kubectl get daemonset speaker -n metallb-system
```

## Step 5: Verify the Configuration

Create a test application and expose it with a `LoadBalancer` Service:

```bash
kubectl create deployment nginx --image=nginx --port=80
kubectl expose deployment nginx --type=LoadBalancer --port=80
kubectl get service nginx
```

Check the events and logs for any errors:

```bash
kubectl describe service nginx
kubectl logs -n metallb-system deployment/controller
```

## Step 6: Configure Firewall Rules

If the RHEL firewall is enabled, allow traffic to the ports exposed by your LoadBalancer services. For the test NGINX service:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

Layer 2 mode also requires ARP/NDP traffic to pass on the local network.

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload. The `kubectl top` command requires Metrics Server to be installed in the cluster:

```bash
kubectl top pods -n metallb-system
kubectl get events -n metallb-system --sort-by=.lastTimestamp
```

## Security Considerations

- Limit who can edit MetalLB resources such as `IPAddressPool`, `L2Advertisement`, and `BGPPeer`
- Keep the MetalLB controller and speaker images updated
- Restrict access to exposed services with firewall rules and Kubernetes NetworkPolicy where available
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **External IP remains pending**: Verify that an `IPAddressPool` exists in the `metallb-system` namespace and matches the service
2. **IP is assigned but unreachable**: Confirm that the IP range is on the same Layer 2 network and is not blocked by firewalld or upstream network filters
3. **Configuration is rejected**: Check `kubectl describe` output for validation webhook errors and verify the CRD fields

## Conclusion

You have successfully configured MetalLB Load Balancer for bare-metal Kubernetes on RHEL. Monitor the MetalLB pods and service events regularly and keep the deployment updated to maintain security and performance.
