# How to Configure VMware Tanzu Kubernetes with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tanzu, VMware, IPv6, Kubernetes, Antrea, Dual-Stack

Description: A guide to configuring VMware Tanzu Kubernetes Grid (TKG) with IPv6 and dual-stack networking using Antrea CNI and NSX-T Advanced Load Balancer.

VMware Tanzu Kubernetes Grid supports dual-stack IPv4/IPv6 networking using Antrea as the CNI plugin. This guide covers TKG cluster configuration for IPv6, VMware NSX integration, and workload verification.

## Tanzu Kubernetes Grid IPv6 Requirements

- TKG 2.5.x for full dual-stack workload cluster support with Kube-VIP and Avi Load Balancer
- Antrea CNI (included with TKG and used by default)
- vSphere 7.0 or vSphere 8 with vCenter configured for IPv4 and IPv6 connectivity
- Nodes must have dual-stack IP addresses

## TKG Management Cluster with Dual-Stack

```yaml
# ~/.config/tanzu/tkg/clusterconfigs/management-cluster.yaml

CLUSTER_NAME: mgmt-cluster
CLUSTER_PLAN: prod
INFRASTRUCTURE_PROVIDER: vsphere

# Network configuration

SERVICE_CIDR: "100.64.0.0/13,fd00:100:64::/108"
CLUSTER_CIDR: "100.96.0.0/11,fd00:100:96::/48"

# Standard vSphere settings are required; add values for your environment:
# VSPHERE_SERVER, VSPHERE_USERNAME, VSPHERE_PASSWORD, VSPHERE_DATACENTER,
# VSPHERE_RESOURCE_POOL, VSPHERE_DATASTORE, VSPHERE_FOLDER,
# VSPHERE_SSH_AUTHORIZED_KEY, and VSPHERE_TLS_THUMBPRINT or VSPHERE_INSECURE.

# Node network
VSPHERE_NETWORK: "VM Network"

# Enable IPv4-primary dual-stack networking
TKG_IP_FAMILY: ipv4,ipv6
```

```bash
# Initialize management cluster
tanzu mc create \
  --file management-cluster.yaml \
  --timeout 60m

# Verify management cluster
tanzu mc get
kubectl get nodes -o wide
```

## Workload Cluster with IPv6

```yaml
# workload-cluster.yaml

CLUSTER_NAME: workload-ipv6
CLUSTER_PLAN: prod
INFRASTRUCTURE_PROVIDER: vsphere

# Dual-stack network configuration
TKG_IP_FAMILY: ipv4,ipv6
SERVICE_CIDR: "100.64.0.0/13,fd00:100:64::/108"
CLUSTER_CIDR: "100.96.0.0/11,fd00:100:96::/48"

# Antrea CNI
CNI: antrea

# Standard vSphere settings are required; add values for your environment.
VSPHERE_NETWORK: "VM Network"
```

```bash
# Create workload cluster
tanzu cluster create workload-ipv6 --file workload-cluster.yaml

# Get kubeconfig for workload cluster
tanzu cluster kubeconfig get workload-ipv6 --admin --export-file workload-kubeconfig.yaml

# Verify dual-stack
KUBECONFIG=workload-kubeconfig.yaml kubectl get nodes -o wide
```

## Antrea Dual-Stack Configuration

Antrea is configured by the `antrea-config` ConfigMap:

```bash
# Check current Antrea configuration
kubectl get configmap antrea-config -n kube-system -o yaml

# Dual-stack is selected through the TKG cluster settings at creation time:
# TKG_IP_FAMILY: ipv4,ipv6
# CLUSTER_CIDR: 100.96.0.0/11,fd00:100:96::/48
# SERVICE_CIDR: 100.64.0.0/13,fd00:100:64::/108
```

```bash
# Verify Antrea pods are running
kubectl get pods -n kube-system -l app=antrea

# Check Antrea agent logs for IPv6 activity
kubectl logs -n kube-system \
  $(kubectl get pod -n kube-system -l component=antrea-agent -o name | head -1) \
  | grep -i "ipv6\|dual" | tail -20

# Check antctl (Antrea CLI) for network info
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l component=antrea-agent -o name | head -1) \
  -c antrea-agent -- antctl get networkpolicy
```

## VMware NSX Integration with IPv6

When using TKG with NSX-backed vSphere networking, IPv6 is configured in NSX Manager:

```bash
# Verify the node network adapter has IPv6
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{.status.addresses}{"\n\n"}{end}'

# NSX segments should be configured for dual-stack
# This is done in NSX Manager UI:
# Networking > Segments > <segment> > Subnets > Add IPv6 subnet

# Verify Antrea OVS flows include IPv6 forwarding entries
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l component=antrea-agent -o name | head -1) \
  -c antrea-agent -- antctl get ovsflows | grep -i ipv6
```

## Dual-Stack Service Deployment

```yaml
# Service with dual-stack in Tanzu cluster
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
# LoadBalancer service (requires Avi Load Balancer/AKO or another LB provider)
# In TKG 2.5, Avi Load Balancer service type LoadBalancer uses a single frontend VIP.
apiVersion: v1
kind: Service
metadata:
  name: my-app-lb
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: my-app
  ports:
    - port: 80
```

```bash
kubectl apply -f services.yaml

# Check dual-stack ClusterIP
kubectl get svc my-app-svc -o jsonpath='{range .spec.clusterIPs[*]}{.}{"\n"}{end}'
# Output:
# 100.x.x.x
# fd00:100:64::x
```

## Verifying IPv6 in Tanzu Workloads

```bash
# Deploy a diagnostic pod
kubectl run netshoot --image=nicolaka/netshoot --restart=Never -- sleep 3600

# Check IPv6 address
kubectl exec netshoot -- ip -6 addr show
kubectl exec netshoot -- ip -6 route show

# Test IPv6 connectivity between pods
kubectl get pod -o wide
kubectl exec netshoot -- ping -6 -c 3 fd00:100:96::10

# Test DNS resolves AAAA records
kubectl exec netshoot -- nslookup -type=AAAA my-app-svc.default.svc.cluster.local

# Test IPv6 service connectivity
kubectl exec netshoot -- curl -6 http://[fd00:100:64::10]/

# Cleanup
kubectl delete pod netshoot
```

## Troubleshooting Tanzu IPv6

```bash
# Check TKG cluster health
tanzu cluster list --include-management-cluster

# Check Antrea for IPv6-specific issues
kubectl logs -n kube-system \
  $(kubectl get pod -n kube-system -l component=antrea-controller -o name) \
  | grep -i "error\|ipv6" | tail -20

# Verify vSphere VM has IPv6 address (check VM hardware/VMware Tools)
# The VM must receive an IPv6 address from the network layer

# Check kube-apiserver logs for dual-stack issues
kubectl logs -n kube-system kube-apiserver-<control-plane-node> \
  | grep -i "ipv6\|dual-stack" | tail -20
```

Tanzu Kubernetes Grid's dual-stack support with Antrea CNI provides robust IPv6 networking for enterprise vSphere environments. The key is configuring both pod and service CIDRs with IPv6 ranges at cluster creation time, as Tanzu follows Kubernetes upstream dual-stack semantics.
