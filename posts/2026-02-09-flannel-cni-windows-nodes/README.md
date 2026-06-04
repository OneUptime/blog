# How to Set Up Flannel CNI for Windows Nodes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, Flannel

Description: Step-by-step guide to installing and configuring Flannel CNI plugin for Windows worker nodes in a mixed OS Kubernetes cluster.

---

Flannel is one of the simplest and most widely used Container Network Interface (CNI) plugins for Kubernetes. While it started as a Linux-only solution, Flannel now supports Windows nodes, enabling hybrid clusters that run both Linux and Windows workloads. This guide walks through setting up Flannel CNI for Windows nodes, from installation to troubleshooting common issues.

## Understanding Flannel for Windows

Flannel creates an overlay network that spans all nodes in your Kubernetes cluster. Each node gets a subnet from the cluster's pod CIDR range, and Flannel handles routing traffic between pods across nodes.

For Windows, Flannel operates differently than on Linux. Windows doesn't support all the same networking features, so Flannel uses either the host-gateway backend (requires layer 2 connectivity) or VXLAN backend (creates an overlay network) depending on your infrastructure.

The Windows implementation of Flannel runs as a native Windows service called `flanneld.exe` and integrates with the Host Networking Service (HNS) to configure Windows container networking.

## Prerequisites

Before installing Flannel on Windows nodes, ensure you have:

- A Kubernetes cluster with at least one Linux control plane node (version 1.22 or later)
- Windows Server 2019 or Windows Server 2022 nodes. For VXLAN/overlay networking on Windows Server 2019, install KB4489899.
- containerd installed on Windows nodes
- Network connectivity between all nodes
- PowerShell 5.1 or later on Windows nodes

## Installing Flannel on Linux Control Plane

First, deploy Flannel on your Linux nodes. This establishes the networking foundation:

```bash
# Download the Flannel manifest

curl -LO https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Edit the manifest to configure pod CIDR if needed
# Default is 10.244.0.0/16
```

Review and modify the ConfigMap if you need custom settings:

```yaml
# kube-flannel.yml excerpt
kind: ConfigMap
apiVersion: v1
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true
          }
        },
        {
          "type": "portmap",
          "capabilities": {
            "portMappings": true
          }
        }
      ]
    }
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "VNI": 4096,
        "Port": 4789
      }
    }
```

Apply the Flannel manifest:

```bash
kubectl apply -f kube-flannel.yml

# Verify Flannel is running on Linux nodes
kubectl get pods -n kube-flannel
kubectl get nodes -o wide
```

## Preparing Windows Nodes

On each Windows node, install the required components:

```powershell
# Run as Administrator
# Install containerd before joining the node

# Create directory for Flannel
New-Item -Path "C:\k" -ItemType Directory -Force
New-Item -Path "C:\k\flannel" -ItemType Directory -Force
New-Item -Path "C:\k\cni\bin" -ItemType Directory -Force
New-Item -Path "C:\k\cni\config" -ItemType Directory -Force

# Download Flannel for Windows
$FlannelVersion = "v0.21.0"
$DownloadURL = "https://github.com/flannel-io/flannel/releases/download/$FlannelVersion/flanneld.exe"
Invoke-WebRequest -Uri $DownloadURL -OutFile "C:\k\flannel\flanneld.exe"

# Download the Flannel CNI plugin for Windows
$FlannelCNIVersion = "v1.2.0-flannel1"
$FlannelCNIURL = "https://github.com/flannel-io/cni-plugin/releases/download/$FlannelCNIVersion/cni-plugin-flannel-windows-amd64-$FlannelCNIVersion.tgz"
Invoke-WebRequest -Uri $FlannelCNIURL -OutFile "C:\k\flannel-cni.tgz"
tar.exe -xzf "C:\k\flannel-cni.tgz" -C "C:\k\cni\bin"
Move-Item -Path "C:\k\cni\bin\flannel-amd64.exe" -Destination "C:\k\cni\bin\flannel.exe" -Force

# Download Windows CNI plugins
$CNIVersion = "v1.2.0"
$CNIPluginURL = "https://github.com/containernetworking/plugins/releases/download/$CNIVersion/cni-plugins-windows-amd64-$CNIVersion.tgz"
Invoke-WebRequest -Uri $CNIPluginURL -OutFile "C:\k\cni-plugins.tgz"

# Extract CNI plugins
tar.exe -xzf "C:\k\cni-plugins.tgz" -C "C:\k\cni\bin"
```

## Joining Windows Nodes to the Cluster

Before configuring Flannel, join the Windows node to the cluster:

```powershell
# Retrieve the join command from your control plane
# Example join command (replace with your actual values):
kubeadm.exe join 10.0.0.1:6443 --token abcdef.0123456789abcdef `
  --discovery-token-ca-cert-hash sha256:1234567890abcdef... `
  --cri-socket "npipe:////./pipe/containerd-containerd"
```

If using a custom join script, ensure the kubelet service is configured correctly:

```powershell
# Create kubelet service configuration
$KubeletConfig = @"
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
"@

$KubeletConfig | Out-File -FilePath "C:\k\kubelet-config.yaml" -Encoding ASCII

# Register kubelet as a service
sc.exe create kubelet start= auto binPath= "C:\k\kubelet.exe --config=C:\k\kubelet-config.yaml --hostname-override=$env:COMPUTERNAME --v=6"
sc.exe start kubelet
```

## Configuring Flannel on Windows Nodes

Create the Flannel configuration file:

```powershell
# Get the node's subnet from Kubernetes
$NodeName = $env:COMPUTERNAME.ToLower()
$NodeSubnet = kubectl get node $NodeName -o jsonpath='{.spec.podCIDR}'

Write-Host "Node subnet: $NodeSubnet"

# Create Flannel network configuration
$FlannelConfig = @"
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "VNI": 4096,
    "Port": 4789,
    "MacPrefix": "0E-2A"
  }
}
"@

$FlannelConfig | Out-File -FilePath "C:\k\flannel\net-conf.json" -Encoding ASCII
```

Create a script to start Flannel:

```powershell
# start-flannel.ps1
$env:NODE_NAME = $env:COMPUTERNAME.ToLower()

# Get network configuration from Kubernetes
$ClusterCIDR = "10.244.0.0/16"
$ServiceCIDR = "10.96.0.0/12"

# Start flanneld
C:\k\flannel\flanneld.exe `
  --kubeconfig-file="C:\k\config" `
  --iface=Ethernet `
  --ip-masq=1 `
  --kube-subnet-mgr=1 `
  -v=4
```

Register Flannel as a Windows service:

```powershell
# Create Flannel service wrapper
$ServiceScript = @"
C:\k\flannel\flanneld.exe --kubeconfig-file=C:\k\config --iface=Ethernet --ip-masq=1 --kube-subnet-mgr=1
"@

$ServiceScript | Out-File -FilePath "C:\k\flannel\start-flannel.cmd" -Encoding ASCII

# Install NSSM (Non-Sucking Service Manager) to run Flannel as a service
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "C:\k\nssm.zip"
Expand-Archive -Path "C:\k\nssm.zip" -DestinationPath "C:\k" -Force
Copy-Item "C:\k\nssm-2.24\win64\nssm.exe" -Destination "C:\k\nssm.exe"

# Create service
C:\k\nssm.exe install flanneld C:\k\flannel\start-flannel.cmd
C:\k\nssm.exe set flanneld AppDirectory C:\k\flannel
C:\k\nssm.exe set flanneld AppStdout C:\k\flannel\flanneld.log
C:\k\nssm.exe set flanneld AppStderr C:\k\flannel\flanneld-error.log

# Start the service
Start-Service flanneld

# Verify service is running
Get-Service flanneld
```

## Configuring CNI for Windows

Create the CNI configuration file for Windows:

```powershell
$CNIConfig = @"
{
  "cniVersion": "0.2.0",
  "name": "flannel",
  "type": "flannel",
  "delegate": {
    "type": "win-overlay",
    "endpointMacPrefix": "0E-2A",
    "dns": {
      "nameservers": ["10.96.0.10"],
      "search": [
        "svc.cluster.local"
      ]
    }
  }
}
"@

$CNIConfig | Out-File -FilePath "C:\k\cni\config\cni.conf" -Encoding ASCII
```

Configure containerd to use the CNI directories. Kubernetes 1.24 and later removed the kubelet `--network-plugin`, `--cni-bin-dir`, and `--cni-conf-dir` flags, so the container runtime must load the CNI configuration:

```powershell
$ContainerdConfig = "$env:ProgramFiles\containerd\config.toml"

# Generate a default config if the file does not exist
if (-not (Test-Path $ContainerdConfig)) {
  containerd.exe config default | Out-File $ContainerdConfig -Encoding ASCII
}

# Set these values in config.toml:
# [plugins."io.containerd.grpc.v1.cri".cni]
#   bin_dir = "C:\\k\\cni\\bin"
#   conf_dir = "C:\\k\\cni\\config"

Restart-Service containerd
Restart-Service kubelet
```

## Testing Windows Pod Networking

Deploy a test pod to verify networking:

```yaml
# windows-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-network-test
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: test
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "Testing network connectivity..."

      # Test DNS resolution
      Resolve-DnsName kubernetes.default.svc.cluster.local

      # Test external connectivity
      Test-NetConnection -ComputerName google.com -Port 443

      # Display network configuration
      Get-NetIPAddress
      Get-NetRoute

      # Keep container running
      Start-Sleep -Seconds 3600
```

Apply and test:

```bash
kubectl apply -f windows-test-pod.yaml
kubectl get pod windows-network-test -o wide

# Check pod logs
kubectl logs windows-network-test

# Test connectivity from inside the pod
kubectl exec windows-network-test -- powershell -Command "Test-NetConnection kubernetes.default.svc.cluster.local"

# Test pod-to-pod communication across nodes
kubectl run linux-test --image=nginx --restart=Never
kubectl get pod linux-test -o wide

# Get Linux pod IP and test from Windows pod
kubectl exec windows-network-test -- powershell -Command "Test-NetConnection <linux-pod-ip> -Port 80"
```

## Troubleshooting Flannel on Windows

When issues arise, check these common areas:

**Verify Flannel service is running:**

```powershell
Get-Service flanneld
Get-Content C:\k\flannel\flanneld.log -Tail 50
```

**Check HNS networks:**

```powershell
# List Host Networking Service networks
Get-HnsNetwork | Select Name, Type, Subnets

# Check for the Flannel network
Get-HnsNetwork | Where-Object Name -eq "flannel"

# Remove stuck networks if needed
Get-HnsNetwork | Where-Object Name -eq "flannel" | Remove-HnsNetwork
```

**Verify node has received a subnet:**

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,SUBNET:.spec.podCIDR
```

**Check CNI plugin execution:**

```powershell
# Enable CNI debugging
$env:CNI_COMMAND = "ADD"
$env:CNI_CONTAINERID = "test"
$env:CNI_NETNS = "test"
$env:CNI_IFNAME = "eth0"
$env:CNI_PATH = "C:\k\cni\bin"

# Test CNI plugin
Get-Content C:\k\cni\config\cni.conf | C:\k\cni\bin\flannel.exe
```

**Review kubelet logs:**

```powershell
Get-WinEvent -LogName Application -Source kubelet | Select -First 20 | Format-List
```

## Performance Optimization

Optimize Flannel performance on Windows:

```powershell
# Increase MTU if your network supports it
# Edit net-conf.json
$FlannelConfig = @"
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "VNI": 4096,
    "Port": 4789,
    "MacPrefix": "0E-2A",
    "MTU": 1400
  }
}
"@

# Configure Windows Firewall rules for VXLAN and kubelet traffic
New-NetFirewallRule -DisplayName "Flannel VXLAN" -Direction Inbound -Protocol UDP -LocalPort 4789 -Action Allow
New-NetFirewallRule -DisplayName "Kubernetes API" -Direction Inbound -Protocol TCP -LocalPort 10250 -Action Allow
```

## Conclusion

Setting up Flannel CNI for Windows nodes requires careful configuration of both the CNI plugin and Windows networking services. The combination of flanneld, HNS, and proper CNI configuration enables seamless networking in mixed OS Kubernetes clusters.

While Flannel provides a straightforward networking solution, remember that Windows container networking has inherent limitations compared to Linux. For production clusters, thoroughly test network performance and reliability, implement proper monitoring, and maintain good documentation of your network topology.

With Flannel properly configured, your Windows workloads can communicate efficiently with Linux pods and external services, enabling true hybrid cloud-native applications.
