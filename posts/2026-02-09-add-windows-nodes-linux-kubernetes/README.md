# How to Add Windows Worker Nodes to an Existing Linux Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, Mixed OS, Hybrid Cluster, Windows Containers

Description: Learn how to add Windows worker nodes to an existing Linux-based Kubernetes cluster for running Windows containers alongside Linux workloads in a mixed OS environment.

---

Many organizations need to run both Linux and Windows workloads on Kubernetes. While Kubernetes control planes must run on Linux, worker nodes can run Windows Server, allowing you to deploy Windows containers. This mixed OS setup enables you to modernize Windows applications while leveraging Kubernetes orchestration.

In this guide, you'll learn how to add Windows worker nodes to an existing Linux Kubernetes cluster and configure your environment for mixed OS workloads.

## Prerequisites and Planning

Before adding Windows nodes, verify your cluster meets these requirements. Use a supported Kubernetes version and keep the Windows kubelet version within the Kubernetes version skew policy. The control plane must run on Linux. The network plugin must support Windows (Calico or Antrea are commonly used). For current Kubernetes releases, use Windows Server 2022 or later for worker nodes.

Plan your networking carefully since Windows containers use different networking modes than Linux containers. Review application requirements to determine which workloads need Windows nodes.

## Preparing the Windows Node

Provision a Windows Server instance with these specifications:

```powershell
# Minimum requirements

# Windows Server 2022 or later
# 2 vCPUs
# 4 GB RAM
# 30 GB disk space

# Install required Windows features
Install-WindowsFeature -Name containers

# Install containerd with the SIG Windows helper script
curl.exe -LO https://raw.githubusercontent.com/kubernetes-sigs/sig-windows-tools/master/hostprocess/Install-Containerd.ps1
.\Install-Containerd.ps1 -ContainerDVersion 1.7.22

# Restart to complete installation
Restart-Computer -Force
```

After restart, verify containerd:

```powershell
# Start containerd service if it is not already running
Start-Service containerd

# Verify containerd installation
ctr.exe version

# Pull Windows base images
ctr.exe -n k8s.io images pull mcr.microsoft.com/windows/servercore:ltsc2022
ctr.exe -n k8s.io images pull mcr.microsoft.com/windows/nanoserver:ltsc2022
```

## Installing Kubernetes Components on Windows

Download and install Kubernetes components:

```powershell
# Install kubeadm and kubelet
curl.exe -LO https://raw.githubusercontent.com/kubernetes-sigs/sig-windows-tools/master/hostprocess/PrepareNode.ps1
.\PrepareNode.ps1 -KubernetesVersion v1.36.0

# Optional: install kubectl for management
curl.exe -LO "https://dl.k8s.io/v1.36.0/bin/windows/amd64/kubectl.exe"
```

## Configuring Networking for Windows Nodes

Install and configure a Windows-capable CNI plugin. For Calico on Windows, prepare the Linux-side Calico installation first:

```bash
# For Calico VXLAN clusters, use VXLAN rather than VXLANCrossSubnet
kubectl patch installation default --type='json' -p='[{"op": "replace", "path": "/spec/calicoNetwork/ipPools/0/encapsulation", "value": "VXLAN"}]'

# Disable BGP when using the Calico operator with Windows nodes
kubectl patch installation default --type=merge -p '{"spec": {"calicoNetwork": {"bgp": "Disabled"}}}'
```

Alternatively, follow the Antrea Windows installation guide for a containerd-based Windows setup. CNI setup on mixed Linux and Windows clusters is plugin-specific, so use the instructions for the exact plugin and version you deploy.

## Joining the Windows Node to the Cluster

Generate a join command from your Linux control plane:

```bash
# On Linux control plane, get the join command
kubeadm token create --print-join-command
```

On the Windows node, run the generated command from an elevated PowerShell session:

```powershell
kubeadm join --token <token> <control-plane-host>:<control-plane-port> --discovery-token-ca-cert-hash sha256:<hash>
```

## Registering Windows Node as a Service

The SIG Windows setup scripts and `kubeadm join` configure the kubelet service. Verify the service after the node joins:

```powershell
# Start kubelet if needed
Start-Service kubelet

# Verify service is running
Get-Service kubelet
```

## Verifying Windows Node Registration

From your Linux control plane, verify the Windows node joined successfully:

```bash
kubectl get nodes

# You should see the Windows node
# NAME            STATUS   ROLES    AGE   VERSION
# windows-node-1  Ready    <none>          1m    v1.36.0
# linux-node-1    Ready    control-plane   30d   v1.36.0

# Check node details
kubectl describe node windows-node-1

# Verify OS
kubectl get nodes -o wide
```

## Labeling Windows Nodes

Kubernetes automatically labels nodes with their operating system and Windows build. Verify those labels, then add any custom workload label you need:

```bash
kubectl get node windows-node-1 --show-labels
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
        node.kubernetes.io/windows-build: "10.0.20348"
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
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
# Check kubelet service status and logs
Get-Service kubelet
Get-ChildItem C:\var\logs, C:\var\log\kubelet -ErrorAction SilentlyContinue

# Check container runtime
ctr.exe -n k8s.io containers list
ctr.exe -n k8s.io tasks list

# Check network
ipconfig /all
route print

# Verify CNI files
Get-ChildItem C:\etc\cni\net.d
Get-ChildItem C:\opt\cni\bin
```

Common issues and solutions:

```powershell
# Issue: Kubelet fails to start
# Solution: Check the join token, CA hash, API server reachability, and kubelet configuration

# Issue: Pods stuck in ContainerCreating
# Solution: Verify CNI plugin is working
Get-ChildItem C:\etc\cni\net.d

# Issue: DNS not resolving
# Solution: Check CoreDNS is accessible
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Issue: Can't pull images
# Solution: Check container runtime credentials
ctr.exe -n k8s.io images pull <image>
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
