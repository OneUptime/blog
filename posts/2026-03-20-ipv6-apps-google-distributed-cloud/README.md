# How to Deploy IPv6 Applications on Google Distributed Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Distributed Cloud, Kubernetes, IPv6, GDC, Networking, Bare Metal

Description: A guide to deploying IPv6-enabled applications on Google Distributed Cloud (GDC) Bare Metal, including cluster configuration and load balancer setup.

Google Distributed Cloud (GDC) Bare Metal extends Google Kubernetes Engine to on-premises infrastructure. It supports IPv6 and dual-stack networking, enabling organizations to deploy IPv6 workloads on their own hardware while retaining GKE-compatible APIs.

## Prerequisites

- A Google Distributed Cloud Bare Metal installation
- Admin workstation with `bmctl` CLI installed
- Target nodes with IPv6 addresses assigned on their network interfaces

## Step 1: Configure the Cluster for Dual-Stack

When creating a GDC Bare Metal cluster, set dual-stack in the cluster configuration file. You can't enable dual-stack on an existing cluster after creation:

```yaml
# Relevant dual-stack portions of bmctl-workspace/my-ipv6-cluster/my-ipv6-cluster.yaml

apiVersion: baremetal.cluster.gke.io/v1
kind: Cluster
metadata:
  name: my-ipv6-cluster
  namespace: cluster-my-ipv6-cluster
spec:
  type: standalone
  # Enable dual-stack address families
  clusterNetwork:
    pods:
      cidrBlocks:
        - 192.168.0.0/16
    services:
      cidrBlocks:
        - 10.96.0.0/20
        - fd00:1234:2::/116   # IPv6 service CIDR
  # For bundled load balancing, provide both IPv4 and IPv6 address pools
  loadBalancer:
    mode: bundled
    ports:
      controlPlaneLBPort: 443
    vips:
      controlPlaneVIP: "10.0.0.8"
      ingressVIP: "10.0.0.9"
    addressPools:
      - name: default
        addresses:
          - "10.0.0.9-10.0.0.19"
          - "fd00:1234:3::100-fd00:1234:3::10f"
---
apiVersion: baremetal.cluster.gke.io/v1alpha1
kind: ClusterCIDRConfig
metadata:
  name: cluster-wide-ranges
  namespace: cluster-my-ipv6-cluster
spec:
  ipv4:
    cidr: 192.168.0.0/16
    perNodeMaskSize: 24
  ipv6:
    cidr: fd00:1234:1::/112
    perNodeMaskSize: 120
```

## Step 2: Create the Cluster

```bash
# Create the cluster using the bmctl CLI
bmctl create cluster -c my-ipv6-cluster

# Monitor cluster creation progress
bmctl check cluster -c my-ipv6-cluster
```

## Step 3: Deploy an IPv6 Application

Once the cluster is running, deploy a workload and expose it via a dual-stack Service:

```yaml
# ipv6-app.yaml - Deployment and dual-stack Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipv6-nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ipv6-nginx
  template:
    metadata:
      labels:
        app: ipv6-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:stable
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ipv6-nginx-svc
spec:
  selector:
    app: ipv6-nginx
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

```bash
kubectl apply -f ipv6-app.yaml
```

## Step 4: Verify Load Balancer Assignment

```bash
# Check that the service has both IPv4 and IPv6 LoadBalancer IPs
kubectl get svc ipv6-nginx-svc -o jsonpath='{.status.loadBalancer.ingress[*].ip}'

# Get the ClusterIPs to verify dual-stack assignment
kubectl get svc ipv6-nginx-svc -o jsonpath='{.spec.clusterIPs}'
```

## Step 5: Test IPv6 Connectivity

```bash
# Get the external IPv6 load balancer IP
LB_IPV6=$(kubectl get svc ipv6-nginx-svc \
  -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{"\n"}{end}' | grep ':' | head -n1)

# Test HTTP access via IPv6
curl -6 "http://[$LB_IPV6]/"
```

## Step 6: Configure Network Policies for IPv6

GDC Bare Metal with Calico supports Kubernetes `NetworkPolicy`; the same policy applies to IPv4 and IPv6 traffic:

```yaml
# allow-ipv6-ingress.yaml - Allow HTTP traffic to the application
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-http
spec:
  podSelector:
    matchLabels:
      app: ipv6-nginx
  ingress:
    - ports:
        - protocol: TCP
          port: 80
  policyTypes:
    - Ingress
```

## Monitoring

Use OneUptime to monitor the IPv6 endpoints of your GDC-deployed applications with uptime checks that verify both IPv4 and IPv6 reachability:

```bash
# Quick connectivity test from outside the cluster
ping -6 "$LB_IPV6"
curl -6 -o /dev/null -s -w "%{http_code}" "http://[$LB_IPV6]/"
```

GDC Bare Metal's dual-stack support allows organizations running their own on-premises hardware to fully embrace IPv6 while using familiar Kubernetes APIs.
