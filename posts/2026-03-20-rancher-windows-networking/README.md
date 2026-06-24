# How to Configure Windows Networking in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Networking, Flannel, CNI

Description: Configure networking for Windows nodes in Rancher Kubernetes clusters including CNI selection, network policies, DNS resolution, and service connectivity.

## Introduction

Windows networking in Kubernetes has specific constraints compared to Linux. Not all CNI plugins support Windows, DNS resolution behaves differently, and network policy support depends on the CNI you choose. This guide covers the networking setup required for Windows nodes in Rancher clusters.

## Prerequisites

- Rancher cluster with Linux control plane and Windows workers
- Windows Server 2019 or 2022 nodes
- Understanding of Kubernetes networking basics

## Step 1: Choose a Windows-Compatible CNI

```bash
# Supported CNI plugins for Rancher-provisioned RKE2 clusters with Windows nodes (as of 2026):

# 1. Flannel - supported on Windows in RKE2; only the vxlan backend is supported
# 2. Calico - supported on Windows in RKE2 and required for NetworkPolicy enforcement

# For RKE2 clusters with Windows, Flannel is the simplest option when you do not need NetworkPolicy
# Check the selected CNI in the server config
grep '^cni:' /etc/rancher/rke2/config.yaml

# Packaged components are deployed as AddOns; look for rke2-flannel or rke2-calico
kubectl get addon -A

# RKE2 config for Windows-compatible Flannel setup
# /etc/rancher/rke2/config.yaml on Linux control plane
cni: flannel
```

## Step 2: Verify Windows Node Networking

```powershell
# On Windows node - verify network setup after joining cluster

# Check HNS (Host Network Service) networks and subnets
Get-HnsNetwork | Select-Object Name, Type, Subnets

# If using Flannel, verify the vxlan adapter was created
Get-NetAdapter | Where-Object {$_.Name -like "*flannel*"}

# Verify DNS resolution inside pods
# Use ltsc2019 on Windows Server 2019 nodes or ltsc2022 on Windows Server 2022 nodes
$image = "mcr.microsoft.com/windows/servercore:ltsc2022"
kubectl run test-win --image=$image `
  --overrides='{"apiVersion":"v1","spec":{"nodeSelector":{"kubernetes.io/os":"windows"}}}' `
  --restart=Never --rm -it --command -- powershell.exe -Command "Resolve-DnsName kubernetes.default.svc.cluster.local"
```

## Step 3: Configure Windows Node Network Policies

```yaml
# On Rancher/RKE2 Windows clusters, NetworkPolicy enforcement requires Calico.
# Flannel does not enforce NetworkPolicy.

# Windows NetworkPolicy example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: windows-app-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: windows-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from the ingress controller namespace used by your cluster
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow DNS
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow HTTPS to external services
    - ports:
        - protocol: TCP
          port: 443
```

## Step 4: Configure DNS for Windows Containers

```powershell
# Windows containers use different DNS configuration

# Verify DNS in a running Windows pod that includes PowerShell
kubectl exec -it win-pod -n production -- powershell.exe

# Inside container:
Get-DnsClientServerAddress
Resolve-DnsName kubernetes.default.svc.cluster.local
Resolve-DnsName my-service.production.svc.cluster.local
```

```bash
# Standard CoreDNS configuration is normally sufficient for Windows pods.
# Verify the kube-dns Service and CoreDNS pods before changing CoreDNS config.
kubectl get svc kube-dns -n kube-system
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Step 5: Service Connectivity from Windows Pods

```powershell
# Test connectivity from Windows pod to Linux service

# Exec into Windows pod
$pod = kubectl get pod -n production -l app=windows-app -o name | Select-Object -First 1
kubectl exec -it $pod -n production -- powershell.exe

# Test ClusterIP service connectivity
Invoke-WebRequest -UseBasicParsing -Uri "http://linux-service.production.svc.cluster.local:8080/health"

# Test NodePort service
$nodeIP = "10.0.0.21"  # IP of a Linux worker node
Invoke-WebRequest -UseBasicParsing -Uri "http://${nodeIP}:30080/health"

# Test external connectivity and DNS
Invoke-WebRequest -UseBasicParsing -Uri "https://api.example.com/health"
```

## Step 6: Use Port Mapping Instead of hostNetwork

```yaml
# Windows does not support hostNetwork; use a Service or explicit port mapping instead
apiVersion: apps/v1
kind: Deployment
metadata:
  name: win-host-network-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: win-host-network-app
  template:
    metadata:
      labels:
        app: win-host-network-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      hostNetwork: false
      containers:
        - name: app
          image: registry.example.com/windows-app:v1.0
          # Port mapping is supported; prefer a Service when possible
          ports:
            - containerPort: 8080
              hostPort: 8080
```

## Step 7: Troubleshoot Windows Networking

```powershell
# Common Windows networking debugging steps

# Check HNS policy (load balancing rules for Services)
Get-HnsPolicyList

# Check the expected Service ClusterIPs from the cluster API
# Use a Windows pod, not the Windows host, for actual ClusterIP connectivity tests
kubectl get svc kubernetes -o wide
kubectl get svc kube-dns -n kube-system -o wide

# Check Windows firewall rules for Kubernetes
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*kube*"}

# Verify network adapter configuration
Get-NetIPConfiguration | Where-Object {$_.InterfaceAlias -like "*vEthernet*"}

# Capture network traffic (requires Npcap/WinPcap)
netsh trace start capture=yes maxsize=100 tracefile=C:\trace.etl
# ... reproduce issue ...
netsh trace stop
```

## Conclusion

Windows networking in Kubernetes requires careful CNI selection. In Rancher-provisioned RKE2 clusters, Flannel with vxlan is the simplest supported option, but it does not enforce NetworkPolicy. DNS resolution and service discovery work similarly to Linux once CoreDNS and the kube-dns Service are healthy. Test connectivity thoroughly after adding Windows nodes, particularly cross-OS service communication between Linux and Windows pods. If you need NetworkPolicy enforcement on Windows in RKE2, use Calico.
