# How to Configure Windows Networking in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Windows Networking, Flannel, CNI, Kubernetes, Windows Containers

Description: Configure Kubernetes networking for Windows nodes in Rancher including CNI plugin selection, DNS configuration, and network policy considerations.

## Introduction

Windows Kubernetes networking differs significantly from Linux in its CNI plugin support, kube-proxy mode, and DNS handling. Understanding these differences is essential for successfully running Windows workloads in Rancher clusters.

## Supported CNI Plugins for Windows

| CNI Plugin | Windows Support | Notes |
|---|---|---|
| Flannel (VXLAN) | Yes | Recommended for simplicity |
| Calico (eBPF) | Partial | Limited Windows support |
| Antrea | Yes | Enterprise features |
| Cilium | No | Linux only |

Flannel with VXLAN backend is the most reliable choice for mixed Linux/Windows clusters.

## Step 1: Configure Flannel for Windows

When creating the Rancher cluster, configure the network plugin:

```yaml
# cluster.yaml (RKE)

network:
  plugin: flannel
  options:
    flannel_backend_type: vxlan    # Required for Windows
    flannel_backend_port: "8472"
```

## Step 2: Verify Network Configuration on Windows Node

```powershell
# On the Windows worker node
# Check flannel is running
Get-Service flanneld

# Check network adapters
Get-NetAdapter | Where-Object {$_.Name -like "*vEthernet*"}

# Verify pod CIDR assignment
ipconfig /all | Select-String "vEthernet"
```

## Step 3: Configure kube-proxy on Windows

Windows requires kube-proxy running in kernelspace mode (winkernel), which uses the Host Network Service (HNS):

```powershell
# Check kube-proxy is running in the correct mode
Get-Service kube-proxy
Get-Item HKLM:\SYSTEM\CurrentControlSet\Services\kube-proxy
```

## Step 4: DNS Configuration

Windows pods use the same cluster DNS as Linux pods, but configuration is applied differently:

```powershell
# Test DNS resolution from a Windows pod
# Run inside a Windows container
Resolve-DnsName kubernetes.default.svc.cluster.local

# If DNS fails, check the kubelet DNS configuration
# Get-Content C:\k\kubelet.exe.config | Select-String "dns"
```

## Step 5: Network Policy Limitations

Windows has limited NetworkPolicy support:

- Ingress policies: Supported for TCP/UDP
- Egress policies: Not supported natively (requires Antrea)
- ICMP: Limited support

```yaml
# Windows-compatible NetworkPolicy (ingress only)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-traffic
  namespace: production
spec:
  podSelector:
    matchLabels:
      kubernetes.io/os: windows
  policyTypes:
    - Ingress    # Egress not supported on Windows
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 80
```

## Step 6: Service Type Configuration

```yaml
# Windows pods support NodePort and ClusterIP services
# LoadBalancer works with cloud provider load balancers
apiVersion: v1
kind: Service
metadata:
  name: windows-app
spec:
  type: ClusterIP
  selector:
    app: windows-app
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP    # UDP support is limited on Windows
```

## Conclusion

Windows networking in Rancher works reliably with Flannel VXLAN but requires careful attention to CNI compatibility and kube-proxy mode. Avoid Cilium and other eBPF-based CNIs for Windows nodes. For production Windows workloads requiring network policies, Antrea provides the most complete Windows NetworkPolicy support.
