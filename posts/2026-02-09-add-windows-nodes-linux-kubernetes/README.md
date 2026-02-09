# How to Add Windows Worker Nodes to an Existing Linux Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Mixed OS, Hybrid Cluster, Windows Containers

Description: Learn how to add Windows worker nodes to an existing Linux-based Kubernetes cluster for running Windows containers alongside Linux workloads in a mixed OS environment.

---

Many organizations need to run both Linux and Windows workloads on Kubernetes. While Kubernetes control planes must run on Linux, worker nodes can run Windows Server, allowing you to deploy Windows containers. This mixed OS setup enables you to modernize Windows applications while leveraging Kubernetes orchestration.

In this guide, you'll learn how to add Windows worker nodes to an existing Linux Kubernetes cluster and configure your environment for mixed OS workloads.

## Prerequisites and Planning

Before adding Windows nodes, verify your cluster meets these requirements. The Kubernetes version must be 1.14 or later for Windows support. The control plane must run on Linux. The network plugin must support Windows (Flannel, Calico, or Antrea recommended). You need Windows Server 2019 or later for worker nodes.

Plan your networking carefully since Windows containers use different networking modes than Linux containers. Review application requirements to determine which workloads need Windows nodes.

## Preparing the Windows Node

Provision a Windows Server instance with these specifications:

```powershell
# Minimum requirements
# Windows Server 2019 or 2022
# 2 vCPUs
# 4 GB RAM
# 30 GB disk space

# Install required Windows features
Install-WindowsFeature -Name containers

# Install Docker (required for Windows containers)
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# Restart to complete installation
Restart-Computer -Force
```

After restart, configure Docker:

```powershell
# Start Docker service
Start-Service docker

# Verify Docker installation
docker version

# Pull Windows base images
docker pull mcr.microsoft.com/windows/servercore:ltsc2019
docker pull mcr.microsoft.com/windows/nanoserver:ltsc2019
```

## Installing Kubernetes Components on Windows

Download and install Kubernetes binaries:

```powershell
# Download kubelet and kube-proxy
$K8S_VERSION = "v1.28.5"
$DOWNLOAD_URL = "https://dl.k8s.io/$K8S_VERSION/bin/windows/amd64"

# Create directory for Kubernetes binaries
New-Item -ItemType Directory -Force -Path C:\k

# Download kubelet
Invoke-WebRequest -Uri "$DOWNLOAD_URL/kubelet.exe" -OutFile C:\k\kubelet.exe

# Download kube-proxy
Invoke-WebRequest -Uri "$DOWNLOAD_URL/kube-proxy.exe" -OutFile C:\k\kube-proxy.exe

# Download kubectl for management
Invoke-WebRequest -Uri "$DOWNLOAD_URL/kubectl.exe" -OutFile C:\k\kubectl.exe

# Add to PATH
$env:Path += ";C:\k"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\k", [EnvironmentVariableTarget]::Machine)
```

## Configuring Networking for Windows Nodes

Install and configure Flannel for Windows:

```powershell
# Download Flannel
Invoke-WebRequest -Uri "https://github.com/flannel-io/flannel/releases/download/v0.24.0/flanneld-amd64.exe" -OutFile C:\k\flanneld.exe

# Create Flannel configuration
@"
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "VNI": 4096,
    "Port": 4789
  }
}
"@ | Out-File C:\k\flannel-config.json -Encoding ascii

# Start Flannel
C:\k\flanneld.exe -kubeconfig-file=C:\k\config -iface=Ethernet -ip-masq=1 -kube-subnet-mgr=1
```

Alternatively, for Calico on Windows:

```powershell
# Download Calico for Windows
Invoke-WebRequest -Uri "https://github.com/projectcalico/calico/releases/download/v3.27.0/calico-windows-v3.27.0.zip" -OutFile C:\calico-windows.zip
Expand-Archive C:\calico-windows.zip C:\CalicoWindows

# Install Calico
cd C:\CalicoWindows\calico-windows
.\install-calico.ps1 -KubeVersion "1.28.5"
```

## Joining the Windows Node to the Cluster

Copy the kubeconfig from your Linux control plane:

```bash
# On Linux control plane, get the join command
kubeadm token create --print-join-command
```

On the Windows node, create the kubeconfig:

```powershell
# Create .kube directory
New-Item -ItemType Directory -Force -Path C:\k\

# Copy kubeconfig from control plane (use SCP or copy manually)
# Save it as C:\k\config
```

Create kubelet configuration:

```yaml
# C:\k\kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
clusterDomain: cluster.local
clusterDNS:
- 10.96.0.10
cgroupDriver: ""  # Windows doesn't use cgroups
hairpinMode: promiscuous-bridge
runtimeRequestTimeout: 10m
serializeImagePulls: false
registerNode: true
enableDebuggingHandlers: true
```

Create kubelet start script:

```powershell
# C:\k\start-kubelet.ps1
$env:CONTAINER_RUNTIME_ENDPOINT = "npipe:////./pipe/docker_engine"
$env:KUBELET_HOSTNAME_OVERRIDE = (hostname).ToLower()

C:\k\kubelet.exe `
  --config=C:\k\kubelet-config.yaml `
  --kubeconfig=C:\k\config `
  --hostname-override=$env:KUBELET_HOSTNAME_OVERRIDE `
  --pod-infra-container-image="mcr.microsoft.com/oss/kubernetes/pause:3.9" `
  --enable-debugging-handlers `
  --cgroups-per-qos=false `
  --enforce-node-allocatable="" `
  --network-plugin=cni `
  --resolv-conf="" `
  --log-dir=C:\k\logs `
  --logtostderr=false `
  --image-pull-progress-deadline=20m
```

Create kube-proxy start script:

```powershell
# C:\k\start-kubeproxy.ps1
$env:KUBELET_HOSTNAME_OVERRIDE = (hostname).ToLower()

C:\k\kube-proxy.exe `
  --kubeconfig=C:\k\config `
  --proxy-mode=kernelspace `
  --hostname-override=$env:KUBELET_HOSTNAME_OVERRIDE `
  --cluster-cidr=10.244.0.0/16 `
  --log-dir=C:\k\logs `
  --logtostderr=false `
  --v=4
```

## Registering Windows Node as a Service

Create Windows services for kubelet and kube-proxy:

```powershell
# Install NSSM (Non-Sucking Service Manager)
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile C:\nssm.zip
Expand-Archive C:\nssm.zip C:\nssm
Copy-Item C:\nssm\nssm-2.24\win64\nssm.exe C:\k\

# Create kubelet service
C:\k\nssm.exe install kubelet C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
C:\k\nssm.exe set kubelet AppParameters "-ExecutionPolicy Bypass -File C:\k\start-kubelet.ps1"
C:\k\nssm.exe set kubelet AppDirectory C:\k
C:\k\nssm.exe set kubelet AppStdout C:\k\logs\kubelet.out.log
C:\k\nssm.exe set kubelet AppStderr C:\k\logs\kubelet.err.log

# Create kube-proxy service
C:\k\nssm.exe install kube-proxy C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
C:\k\nssm.exe set kube-proxy AppParameters "-ExecutionPolicy Bypass -File C:\k\start-kubeproxy.ps1"
C:\k\nssm.exe set kube-proxy AppDirectory C:\k
C:\k\nssm.exe set kube-proxy AppStdout C:\k\logs\kube-proxy.out.log
C:\k\nssm.exe set kube-proxy AppStderr C:\k\logs\kube-proxy.err.log

# Start services
Start-Service kubelet
Start-Service kube-proxy

# Verify services are running
Get-Service kubelet, kube-proxy
```

## Verifying Windows Node Registration

From your Linux control plane, verify the Windows node joined successfully:

```bash
kubectl get nodes

# You should see the Windows node
# NAME            STATUS   ROLES    AGE   VERSION
# windows-node-1  Ready    <none>   1m    v1.28.5
# linux-node-1    Ready    master   30d   v1.28.5

# Check node details
kubectl describe node windows-node-1

# Verify OS
kubectl get nodes -o wide
```

## Labeling Windows Nodes

Add labels to identify Windows nodes:

```bash
kubectl label node windows-node-1 kubernetes.io/os=windows
kubectl label node windows-node-1 node.kubernetes.io/windows-build=10.0.17763
kubectl label node windows-node-1 workload-type=windows
```

## Deploying a Test Windows Workload

Deploy a simple Windows container to verify functionality:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-iis
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis
  template:
    metadata:
      labels:
        app: iis
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2019
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi

---
apiVersion: v1
kind: Service
metadata:
  name: windows-iis
spec:
  type: LoadBalancer
  selector:
    app: iis
  ports:
  - port: 80
    targetPort: 80
```

Apply and verify:

```bash
kubectl apply -f windows-iis.yaml
kubectl get pods -o wide
kubectl get svc windows-iis
```

## Troubleshooting Common Issues

If the node doesn't join, check logs:

```powershell
# Check kubelet logs
Get-Content C:\k\logs\kubelet.err.log -Tail 50

# Check kube-proxy logs
Get-Content C:\k\logs\kube-proxy.err.log -Tail 50

# Check Docker
docker ps
docker logs <container-id>

# Check network
ipconfig /all
route print

# Verify Flannel
Get-Process flanneld
Get-Content C:\k\logs\flanneld.log -Tail 50
```

Common issues and solutions:

```powershell
# Issue: Kubelet fails to start
# Solution: Check kubeconfig path and permissions

# Issue: Pods stuck in ContainerCreating
# Solution: Verify CNI plugin is working
Get-Process flanneld

# Issue: DNS not resolving
# Solution: Check CoreDNS is accessible
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Issue: Can't pull images
# Solution: Check Docker credentials
docker login
```

## Best Practices

Always run Windows containers on Windows nodes and Linux containers on Linux nodes. Cross-OS containerization is not supported.

Use node selectors or node affinity in all pod specifications to ensure correct node placement.

Plan for higher resource requirements on Windows nodes compared to equivalent Linux workloads.

Keep Windows Server updated with latest patches for security and stability.

Use Windows Server 2022 for better container performance and features.

Monitor Windows node resource usage carefully as Windows containers can be more resource-intensive.

## Conclusion

Adding Windows worker nodes to a Linux Kubernetes cluster enables you to run mixed OS workloads while leveraging Kubernetes orchestration. While the setup requires more configuration than Linux-only clusters, the ability to modernize Windows applications using Kubernetes makes it worthwhile for organizations with Windows infrastructure.

Start with a test Windows node to verify your networking and configuration, then scale out as needed for your Windows workloads.
