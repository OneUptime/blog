# How to Set Up Calico CNI for Windows Nodes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Calico

Description: Complete guide to installing and configuring Calico CNI for Windows worker nodes with network policies and advanced routing capabilities.

---

Calico is a powerful Container Network Interface plugin that brings advanced networking and security features to Kubernetes. Unlike simpler CNI plugins, Calico supports network policies, BGP routing, and fine-grained traffic control. For Windows nodes, Calico provides these enterprise features while working within Windows networking constraints. This guide covers installing Calico for Windows nodes and leveraging its advanced capabilities.

## Why Choose Calico for Windows

Calico offers several advantages for Windows Kubernetes deployments:

**Network policies** enable you to control traffic between pods at the IP and port level, providing microsegmentation for Windows workloads. This is critical for compliance and security.

**BGP routing** eliminates overlay network overhead by using standard routing protocols. For Windows containers, which have higher networking overhead than Linux, native routing improves performance.

**Integration with existing infrastructure** allows Calico to peer with physical network devices, making hybrid cloud deployments smoother.

**Cross-platform consistency** means your network policies work the same way on Windows and Linux nodes, simplifying operations.

## Architecture Overview

Calico on Windows consists of several components:

The **Felix agent** runs on each Windows node and programs routing rules and network policies. It uses the Windows Host Networking Service (HNS) to configure container networking.

The **BIRD BGP client** (optional) exchanges routing information with other nodes and network devices. For Windows, this typically runs in a BGP mode or uses VXLAN for simplified deployments.

The **CNI plugin** integrates with kubelet to create and configure pod network interfaces when pods start.

The **confd** daemon generates configuration files based on data from the Kubernetes API and etcd.

## Prerequisites

Before installing Calico on Windows nodes:

- Kubernetes cluster version 1.23 or later
- Windows Server 2019 or 2022 nodes (LTSC versions recommended)
- ContainerD runtime installed on Windows nodes
- At least one Linux control plane node with Calico already running
- Network connectivity between all nodes on required ports
- PowerShell 5.1 or higher

## Installing Calico on Linux Control Plane

First, deploy Calico on your Linux nodes. Use the operator-based installation for easier management:

```bash
# Install the Tigera Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for operator to be ready
kubectl wait --for=condition=Ready pod -l k8s-app=tigera-operator -n tigera-operator --timeout=300s

# Create Installation resource for Calico
cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Configure for Windows support
  kubernetesProvider: ""
  cni:
    type: Calico
  calicoNetwork:
    bgp: Enabled
    ipPools:
    - blockSize: 26
      cidr: 10.48.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
  nodeAddressAutodetectionV4:
    firstFound: true
EOF

# Verify Calico is running
kubectl get pods -n calico-system
kubectl get installation default -o yaml
```

For Windows support, ensure you enable the appropriate settings:

```bash
# Enable Windows support in Calico
kubectl patch installation default --type=merge -p '{"spec":{"calicoNetwork":{"windowsDataplane":"HNS"}}}'

# Apply Windows-specific configuration
cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  kubernetesProvider: ""
  windowsNodes:
    cni: Calico
    kubeletVolumePluginPath: None
EOF
```

## Installing Calico on Windows Nodes

Download and prepare Calico for Windows:

```powershell
# Run as Administrator
# Create directory structure
New-Item -Path "C:\CalicoWindows" -ItemType Directory -Force
Set-Location C:\CalicoWindows

# Download Calico for Windows
$CalicoVersion = "v3.27.0"
$DownloadURL = "https://github.com/projectcalico/calico/releases/download/$CalicoVersion/calico-windows-$CalicoVersion.zip"
Invoke-WebRequest -Uri $DownloadURL -OutFile "calico-windows.zip"

# Extract Calico
Expand-Archive -Path "calico-windows.zip" -DestinationPath "." -Force

# Navigate to extracted directory
Set-Location C:\CalicoWindows\CalicoWindows
```

Configure the installation parameters:

```powershell
# Create configuration file
$CalicoConfig = @{
    KubeVersion = "1.28.0"
    ServiceCidr = "10.96.0.0/12"
    DNSServerIPs = "10.96.0.10"
    Datastore = "kubernetes"
    EtcdEndpoints = ""
    EtcdTlsSecretName = ""
    EtcdKey = ""
    EtcdCert = ""
    EtcdCaCert = ""
    KubeConfigPath = "C:\k\config"
    VXLAN = "Always"
    Backend = "vxlan"
}

# Save configuration
$CalicoConfig | ConvertTo-Json | Out-File -FilePath "config.ps1" -Encoding ASCII
```

Run the Calico installation script:

```powershell
# Import the installation module
Import-Module .\calico\calico.psm1

# Install Calico
.\install-calico.ps1 `
  -KubeVersion "1.28.0" `
  -ServiceCidr "10.96.0.0/12" `
  -DNSServerIPs "10.96.0.10" `
  -KubeConfigPath "C:\k\config"

# The script will:
# 1. Download and install CNI plugins
# 2. Create Calico directories
# 3. Configure HNS networks
# 4. Register Calico services
# 5. Start the Felix and CNI services
```

If you prefer manual installation, follow these steps:

```powershell
# Create CNI configuration
$CNIConfig = @"
{
  "name": "Calico",
  "windows_use_single_network": true,
  "cniVersion": "0.3.1",
  "type": "calico",
  "mode": "vxlan",
  "vxlan_mac_prefix": "0E-2A",
  "vxlan_vni": 4096,
  "policy": {
    "type": "k8s"
  },
  "log_level": "info",
  "capabilities": {"dns": true},
  "DNS": {
    "Nameservers": ["10.96.0.10"],
    "Search": [
      "svc.cluster.local"
    ]
  },
  "nodename_file": "C:/CalicoWindows/nodename",
  "datastore_type": "kubernetes",
  "etcd_endpoints": "",
  "log_file_path": "C:/CalicoWindows/logs/cni.log",
  "ipam": {
    "type": "calico-ipam",
    "subnet": "usePodCidr"
  },
  "policies": [
    {
      "Name": "EndpointPolicy",
      "Value": {
        "Type": "OutBoundNAT",
        "ExceptionList": [
          "10.48.0.0/16",
          "10.96.0.0/12"
        ]
      }
    },
    {
      "Name": "EndpointPolicy",
      "Value": {
        "Type": "ROUTE",
        "DestinationPrefix": "10.96.0.0/12",
        "NeedEncap": true
      }
    }
  ]
}
"@

New-Item -Path "C:\k\cni\config" -ItemType Directory -Force
$CNIConfig | Out-File -FilePath "C:\k\cni\config\10-calico.conf" -Encoding ASCII
```

Configure and start Calico services:

```powershell
# Install Calico services
C:\CalicoWindows\kubernetes\install-kube-services.ps1

# Start Calico Felix
Start-Service -Name CalicoFelix

# Start Calico CNI
Start-Service -Name CalicoCNI

# Verify services are running
Get-Service | Where-Object {$_.Name -like "Calico*"}

# Check service logs
Get-Content C:\CalicoWindows\logs\felix.log -Tail 50
```

## Configuring Network Policies for Windows Pods

One of Calico's key features is network policy support. Create a policy for Windows workloads:

```yaml
# windows-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: windows-app-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: windows-app
      os: windows
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow traffic from specific pods
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
  # Allow traffic from specific namespaces
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 443
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow access to external HTTPS
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # Block metadata service
    ports:
    - protocol: TCP
      port: 443
```

Apply the policy:

```bash
kubectl apply -f windows-network-policy.yaml

# Verify policy is enforced
kubectl describe networkpolicy windows-app-policy

# Check Calico policy status
kubectl get networkpolicies
```

Create a test deployment to verify policies work:

```yaml
# windows-test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: windows-app
      os: windows
  template:
    metadata:
      labels:
        app: windows-app
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: web
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "1Gi"
            cpu: "1"
---
# Allowed frontend pod
apiVersion: v1
kind: Pod
metadata:
  name: frontend
  labels:
    role: frontend
spec:
  containers:
  - name: curl
    image: curlimages/curl
    command: ["sleep", "3600"]
---
# Blocked pod (no matching labels)
apiVersion: v1
kind: Pod
metadata:
  name: unauthorized
spec:
  containers:
  - name: curl
    image: curlimages/curl
    command: ["sleep", "3600"]
```

Test the network policy:

```bash
kubectl apply -f windows-test-deployment.yaml

# Get Windows pod IP
WINDOWS_IP=$(kubectl get pod -l app=windows-app -o jsonpath='{.items[0].status.podIP}')

# Test from allowed pod (should succeed)
kubectl exec frontend -- curl -m 5 http://$WINDOWS_IP:8080

# Test from unauthorized pod (should fail)
kubectl exec unauthorized -- curl -m 5 http://$WINDOWS_IP:8080
```

## Using Calico Global Network Policies

Calico supports cluster-wide policies that apply to all namespaces:

```yaml
# global-windows-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-windows-egress-by-default
spec:
  # Apply to all Windows pods
  selector: kubernetes.io/os == "windows"
  types:
  - Egress
  egress:
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 53
  # Allow Kubernetes API
  - action: Allow
    protocol: TCP
    destination:
      nets:
      - 10.96.0.1/32
      ports:
      - 443
  # Deny everything else
  - action: Deny
```

Apply with calicoctl:

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/

# Configure calicoctl
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Apply the global policy
calicoctl apply -f global-windows-policy.yaml

# View global policies
calicoctl get globalnetworkpolicy -o wide
```

## Monitoring and Troubleshooting

Monitor Calico on Windows nodes:

```powershell
# Check Calico service status
Get-Service CalicoFelix, CalicoCNI

# View Felix logs
Get-Content C:\CalicoWindows\logs\felix.log -Tail 100 -Wait

# View CNI logs
Get-Content C:\CalicoWindows\logs\cni.log -Tail 50

# Check HNS networks
Get-HnsNetwork | Where-Object Name -like "*Calico*"

# View HNS endpoints (pod interfaces)
Get-HnsEndpoint | Select Name, IPAddress, State
```

Common troubleshooting commands:

```powershell
# Restart Calico services
Restart-Service CalicoFelix
Restart-Service CalicoCNI

# Clear HNS state (use with caution)
Get-HnsNetwork | Where-Object Name -like "*Calico*" | Remove-HnsNetwork
Get-HnsEndpoint | Remove-HnsEndpoint

# Reinstall Calico
C:\CalicoWindows\kubernetes\uninstall-calico.ps1
C:\CalicoWindows\kubernetes\install-calico.ps1
```

Check policy enforcement on specific pods:

```bash
# View pod-specific policies
calicoctl get workloadendpoint --all-namespaces -o wide

# Get detailed policy info for a pod
POD_NAME="windows-app-xyz"
calicoctl get workloadendpoint -n default -o yaml | grep -A 50 $POD_NAME
```

## Performance Tuning

Optimize Calico performance on Windows:

```powershell
# Increase Felix processing capacity
# Edit C:\CalicoWindows\config\felix.env
$FelixConfig = @"
FELIX_LOGSEVERITYSCREEN=info
FELIX_DATASTORETYPE=kubernetes
FELIX_KUBECONFIG=C:\k\config
FELIX_VXLANVNI=4096
FELIX_PROMETHEUSMETRICSENABLED=true
FELIX_PROMETHEUSMETRICSPORT=9091
FELIX_USAGEREPORTINGENABLED=false
FELIX_WINDOWSMANAGECALICOHNS=true
"@

$FelixConfig | Out-File -FilePath "C:\CalicoWindows\config\felix.env" -Encoding ASCII

# Restart Felix
Restart-Service CalicoFelix
```

Configure VXLAN settings for better throughput:

```json
{
  "name": "Calico",
  "mode": "vxlan",
  "vxlan_vni": 4096,
  "vxlan_mac_prefix": "0E-2A",
  "mtu": 1410,
  "log_level": "info"
}
```

## Conclusion

Calico brings enterprise-grade networking and security to Windows Kubernetes nodes. While the setup is more complex than simpler CNI plugins, the advanced features like network policies, BGP routing, and fine-grained traffic control make it worthwhile for production deployments.

The combination of Calico's powerful policy engine and Windows container networking enables you to build secure, compliant hybrid applications. With proper configuration and monitoring, Calico provides a robust networking foundation for mixed OS Kubernetes clusters.

For more information about Calico capabilities, refer to the official documentation and consider implementing monitoring dashboards to track network policy enforcement and performance metrics.
