# How to Configure MicroK8s for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MicroK8s, Kubernetes, IPv6, Dual-Stack, Networking

Description: A step-by-step guide to enabling IPv6 and dual-stack networking in a MicroK8s Kubernetes cluster.

MicroK8s is a lightweight Kubernetes distribution ideal for development, CI/CD, and edge deployments. Starting with version 1.28, dual-stack networking can be configured during installation using launch configurations, with Calico as the default CNI.

## Prerequisites

- Ubuntu 20.04 or later
- `snapd` installed on the host
- A network interface with an IPv6 address
- MicroK8s 1.28 or later

## Step 1: Verify Host IPv6 Availability

```bash
# Check that the host has a routable IPv6 address

ip -6 addr show

# Verify IPv6 connectivity
ping6 -c 3 ipv6.google.com
```

## Step 2: Create a Dual-Stack Launch Configuration

MicroK8s uses Calico as its default CNI, and dual-stack should be configured before installation on each node. Create a launch configuration that enables IPv4 and IPv6 for pods and services:

```bash
# Write the launch configuration
cat <<'EOF' >/var/tmp/lc.yaml
---
version: 0.1.0
extraCNIEnv:
  IPv4_SUPPORT: true
  IPv4_CLUSTER_CIDR: 10.1.0.0/16
  IPv4_SERVICE_CIDR: 10.152.183.0/24
  IPv6_SUPPORT: true
  IPv6_CLUSTER_CIDR: fd01::/64
  IPv6_SERVICE_CIDR: fd98::/108
extraSANs:
  - 10.152.183.1
addons:
  - name: dns
EOF

# Make the launch configuration available to MicroK8s
sudo mkdir -p /var/snap/microk8s/common/
sudo cp /var/tmp/lc.yaml /var/snap/microk8s/common/.microk8s.yaml
```

## Step 3: Install MicroK8s

Install MicroK8s from a channel newer or equal to 1.28:

```bash
# Install MicroK8s after the launch configuration is in place
sudo snap install microk8s --classic --channel=1.28/stable
```

## Step 4: Wait for the Cluster to Be Ready

Wait for MicroK8s to start and confirm the node is ready:

```bash
# Wait for the cluster to be ready
microk8s status --wait-ready
microk8s kubectl get nodes
```

## Step 5: Confirm the Networking Components Are Running

Check that Calico and CoreDNS are running in the cluster:

```bash
# Verify the default CNI and DNS pods are up
microk8s kubectl get pods -n kube-system
```

## Step 6: Verify Dual-Stack Is Active

```bash
# Deploy a dual-stack test workload and service
microk8s kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxdualstack
spec:
  selector:
    matchLabels:
      run: nginxdualstack
  replicas: 1
  template:
    metadata:
      labels:
        run: nginxdualstack
    spec:
      containers:
        - name: nginxdualstack
          image: rocks.canonical.com/cdk/diverdane/nginxdualstack:1.0.0
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx6
  labels:
    run: nginxdualstack
spec:
  type: ClusterIP
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  ports:
    - port: 80
      protocol: TCP
  selector:
    run: nginxdualstack
EOF

# Wait for the deployment, then inspect the assigned service and pod IPs
microk8s kubectl rollout status deployment/nginxdualstack
microk8s kubectl get svc nginx6 -o jsonpath='{.spec.clusterIPs}'
microk8s kubectl get pod -l run=nginxdualstack -o jsonpath='{.items[0].status.podIPs}'
```

## Step 7: Test IPv6 Connectivity from a Pod

```bash
# Get the primary IPv6 ClusterIP for the test service
IPV6_SVC_IP=$(microk8s kubectl get svc nginx6 -o jsonpath='{.spec.clusterIPs[0]}')

# Launch a temporary pod and fetch the service over IPv6
microk8s kubectl run ipv6-test --rm -i --restart=Never --image=busybox:1.36 \
  --command -- sh -c "wget -O - http://[$IPV6_SVC_IP]"
```

## Troubleshooting

If pods do not receive IPv6 addresses, confirm that the dual-stack launch configuration was applied and inspect the Calico IP pools:

```bash
# Verify the launch configuration on the host
sudo cat /var/snap/microk8s/common/.microk8s.yaml

# List Calico IP pools
microk8s kubectl get ippools

# Describe the IPv6 pool for details
microk8s kubectl describe ippool <ipv6-pool-name>
```

MicroK8s makes it straightforward to enable IPv6 by configuring dual-stack networking at install time and letting the default Calico CNI apply the requested IPv4 and IPv6 CIDRs.
