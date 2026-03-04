# How to Debug Windows Container Networking Issues in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Networking, Troubleshooting, Debugging, Containers

Description: Learn practical techniques and tools for diagnosing and resolving networking issues with Windows containers running on Kubernetes clusters.

---

Windows container networking in Kubernetes presents unique challenges compared to Linux containers. Different network drivers, Windows-specific networking stack behaviors, and limited debugging tools make troubleshooting more complex. Understanding Windows networking fundamentals and having the right diagnostic approach is essential for maintaining reliable Windows workloads.

In this guide, you'll learn systematic approaches to debug Windows container networking issues in Kubernetes environments.

## Understanding Windows Container Networking Modes

Windows containers support several networking modes. NAT mode provides network address translation for containers. Transparent mode connects containers directly to the physical network. Overlay mode creates virtual networks across multiple hosts. L2Bridge mode provides layer 2 bridging for containers.

Kubernetes on Windows typically uses either Overlay mode (with Flannel or Calico) or L2Bridge mode depending on your network plugin.

## Checking Basic Network Connectivity

Start with fundamental connectivity tests. Verify the pod has an IP address:

```bash
kubectl get pods -o wide

# Check specific pod details
kubectl describe pod <windows-pod-name>
```

Execute basic network commands inside the Windows container:

```bash
# Get shell access
kubectl exec -it <windows-pod-name> -- powershell

# Inside the pod, check IP configuration
ipconfig /all

# Test DNS resolution
nslookup kubernetes.default.svc.cluster.local

# Test connectivity to cluster DNS
Test-NetConnection -ComputerName 10.96.0.10 -Port 53

# Ping another pod
ping <other-pod-ip>

# Test external connectivity
Test-NetConnection -ComputerName google.com -Port 443
```

## Diagnosing DNS Issues

DNS problems are common with Windows containers. Check DNS configuration:

```powershell
# Inside the container
Get-DnsClientServerAddress

# Test DNS queries
Resolve-DnsName kubernetes.default.svc.cluster.local
Resolve-DnsName google.com

# Check DNS cache
Get-DnsClientCache

# Clear DNS cache if needed
Clear-DnsClientCache
```

Verify CoreDNS is accessible:

```bash
# From Linux control plane
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

# Check CoreDNS service
kubectl get svc -n kube-system kube-dns

# Test from Windows pod
kubectl exec -it <windows-pod> -- powershell -Command "Test-NetConnection -ComputerName kube-dns.kube-system.svc.cluster.local -Port 53"
```

If DNS resolution fails, check the pod's resolv.conf equivalent:

```powershell
# Windows doesn't use /etc/resolv.conf
# Check DNS settings directly
Get-DnsClientServerAddress -InterfaceAlias "vEthernet (Ethernet)"
```

## Inspecting HNS (Host Networking Service)

Windows uses HNS to manage container networking. Check HNS configuration on the Windows node:

```powershell
# On the Windows node (not in container)
# Import HNS module
Import-Module HostNetworkingService

# List all HNS networks
Get-HnsNetwork | Format-List

# Get specific network details
Get-HnsNetwork -Name "cbr0" | ConvertTo-Json -Depth 10

# List all HNS endpoints (container network interfaces)
Get-HnsEndpoint | Format-List

# Get endpoint for specific container
$containerId = docker ps --filter "label=io.kubernetes.pod.name=<pod-name>" --format "{{.ID}}"
Get-HnsEndpoint | Where-Object { $_.SharedContainers -contains $containerId }
```

Check for HNS errors:

```powershell
# Check Windows Event Log for HNS errors
Get-WinEvent -FilterHashtable @{
    LogName='Microsoft-Windows-Host-Network-Service-Admin'
    Level=2  # Error
} -MaxEvents 50

# Check for HNS warnings
Get-WinEvent -FilterHashtable @{
    LogName='Microsoft-Windows-Host-Network-Service-Admin'
    Level=3  # Warning
} -MaxEvents 50
```

## Debugging CNI Plugin Issues

Check CNI plugin configuration and logs:

```powershell
# For Flannel
# Check Flannel configuration
Get-Content C:\k\flannel-config.json

# Check Flannel process
Get-Process flanneld

# View Flannel logs
Get-Content C:\var\log\flanneld.log -Tail 50

# For Calico
# Check Calico node status
Get-Service CalicoNode
Get-Service CalicoFelix

# View Calico logs
Get-Content C:\CalicoWindows\logs\calico-node.log -Tail 50
```

Verify CNI binaries are present:

```powershell
# Check CNI plugin directory
Get-ChildItem C:\k\cni -Recurse

# Verify plugin executables
Test-Path C:\k\cni\flannel.exe
Test-Path C:\k\cni\win-bridge.exe
Test-Path C:\k\cni\host-local.exe
```

## Checking Network Policies

Verify network policies aren't blocking traffic:

```bash
# List network policies in namespace
kubectl get networkpolicies -n <namespace>

# Describe specific policy
kubectl describe networkpolicy <policy-name> -n <namespace>

# Check if pod has matching labels
kubectl get pod <pod-name> -n <namespace> --show-labels
```

Test with network policy temporarily disabled:

```bash
# Delete policy for testing
kubectl delete networkpolicy <policy-name> -n <namespace>

# Test connectivity
kubectl exec -it <windows-pod> -- powershell -Command "Test-NetConnection <target-ip> -Port <port>"

# Recreate policy if it wasn't the issue
kubectl apply -f network-policy.yaml
```

## Analyzing Container Network Interfaces

Inspect network interfaces inside containers:

```powershell
# Inside the container
# List all network adapters
Get-NetAdapter | Format-Table Name, Status, MacAddress, LinkSpeed

# Get detailed adapter info
Get-NetAdapter | Get-NetAdapterStatistics

# Check adapter configuration
Get-NetIPAddress
Get-NetRoute

# View adapter hardware info
Get-NetAdapterHardwareInfo
```

Check for IP conflicts:

```powershell
# Test for duplicate IPs
Test-NetConnection -ComputerName <pod-ip> -DiagnoseRouting

# Check ARP table
Get-NetNeighbor
```

## Debugging Service Discovery

Test service endpoints:

```bash
# List service endpoints
kubectl get endpoints <service-name>

# Describe service
kubectl describe svc <service-name>

# Check if pod is included in endpoints
kubectl get endpoints <service-name> -o yaml
```

Test service connectivity from Windows pod:

```powershell
# Resolve service DNS
Resolve-DnsName <service-name>.<namespace>.svc.cluster.local

# Test service IP directly
Test-NetConnection -ComputerName <service-ip> -Port <service-port>

# Test service DNS name
Test-NetConnection -ComputerName <service-name>.<namespace>.svc.cluster.local -Port <service-port>

# Check what IP the service DNS resolves to
[System.Net.Dns]::GetHostAddresses("<service-name>.<namespace>.svc.cluster.local")
```

## Capturing Network Traffic

Use packet capture for deep analysis:

```powershell
# On Windows node
# Start packet capture
netsh trace start capture=yes tracefile=C:\temp\network-trace.etl maxsize=512

# Reproduce the issue

# Stop capture
netsh trace stop

# Convert to pcap format (requires etl2pcapng tool)
etl2pcapng.exe C:\temp\network-trace.etl C:\temp\network-trace.pcap

# Analyze with Wireshark on your workstation
```

Inside container, use PowerShell cmdlets:

```powershell
# Test network path
Test-NetConnection -ComputerName <target> -Port <port> -DiagnoseRouting

# Trace route
Test-NetConnection -ComputerName <target> -TraceRoute

# Get TCP connection state
Get-NetTCPConnection | Where-Object { $_.State -eq "Established" }
```

## Checking Kube-Proxy Status

Verify kube-proxy is running and configured correctly:

```powershell
# On Windows node
# Check kube-proxy service
Get-Service kube-proxy

# View kube-proxy logs
Get-Content C:\k\logs\kube-proxy.log -Tail 100

# Check kube-proxy configuration
Get-Content C:\k\kubeproxy-config.yaml
```

Verify kube-proxy created HNS load balancers:

```powershell
# List HNS load balancing policies
Get-HnsLoadBalancer | Format-Table Id, Protocol, InternalPort, ExternalPort

# Get details of specific service load balancer
Get-HnsLoadBalancer | Where-Object { $_.VirtualIPs -contains "<service-ip>" }
```

## Troubleshooting Load Balancer Services

For LoadBalancer type services on Windows:

```bash
# Check service external IP
kubectl get svc <service-name>

# Check cloud provider load balancer
# For AWS
aws elb describe-load-balancers --load-balancer-names <lb-name>

# Check node registration with load balancer
kubectl get nodes -o wide
```

Test load balancer health checks:

```powershell
# Inside pod, verify health check endpoint responds
Invoke-WebRequest -Uri "http://localhost:<health-port>/healthz"

# Check Windows firewall isn't blocking health checks
Get-NetFirewallRule | Where-Object { $_.Enabled -eq "True" }
```

## Common Issues and Solutions

Issue: Pod cannot reach other pods:

```powershell
# Solution 1: Check HNS network connectivity
Get-HnsNetwork | Format-List

# Solution 2: Restart HNS
Restart-Service hns

# Solution 3: Recreate pod
kubectl delete pod <pod-name>
```

Issue: DNS resolution fails:

```powershell
# Solution 1: Verify CoreDNS pod IPs in DNS config
Get-DnsClientServerAddress

# Solution 2: Check kubelet DNS settings
Get-Content C:\k\kubelet-config.yaml | Select-String "clusterDNS"

# Solution 3: Restart DNS client
Restart-Service Dnscache
```

Issue: Cannot pull images:

```powershell
# Solution: Check Docker networking
docker network ls
docker network inspect nat

# Verify external connectivity
Test-NetConnection -ComputerName mcr.microsoft.com -Port 443
```

## Creating a Diagnostic Script

Automate troubleshooting with a diagnostic script:

```powershell
# diagnose-windows-networking.ps1
param(
    [string]$PodName,
    [string]$Namespace = "default"
)

Write-Host "=== Windows Kubernetes Networking Diagnostics ===" -ForegroundColor Cyan

# Get pod details
Write-Host "`n[1] Pod Information" -ForegroundColor Yellow
kubectl describe pod $PodName -n $Namespace

# Check HNS networks
Write-Host "`n[2] HNS Networks" -ForegroundColor Yellow
Get-HnsNetwork | Format-Table Name, Type, State

# Check HNS endpoints
Write-Host "`n[3] HNS Endpoints" -ForegroundColor Yellow
Get-HnsEndpoint | Format-Table IPAddress, MacAddress, State

# Test DNS
Write-Host "`n[4] DNS Resolution Test" -ForegroundColor Yellow
kubectl exec $PodName -n $Namespace -- powershell -Command `
  "Resolve-DnsName kubernetes.default.svc.cluster.local"

# Test connectivity
Write-Host "`n[5] Connectivity Test" -ForegroundColor Yellow
kubectl exec $PodName -n $Namespace -- powershell -Command `
  "Test-NetConnection -ComputerName 8.8.8.8 -InformationLevel Detailed"

# Check kube-proxy
Write-Host "`n[6] Kube-Proxy Status" -ForegroundColor Yellow
Get-Service kube-proxy

# Check recent errors
Write-Host "`n[7] Recent HNS Errors" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{
    LogName='Microsoft-Windows-Host-Network-Service-Admin'
    Level=2
} -MaxEvents 10 -ErrorAction SilentlyContinue

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan
```

Run diagnostics:

```powershell
.\diagnose-windows-networking.ps1 -PodName my-windows-pod -Namespace production
```

## Best Practices

Always start troubleshooting from the basics: can the pod get an IP, can it resolve DNS, can it reach the internet.

Check HNS health before diving into application-level issues. Many problems stem from HNS misconfigurations.

Keep Windows nodes and container base images updated to get networking fixes.

Document your network topology and CNI plugin configuration for reference during troubleshooting.

Use structured logging in applications to capture network-related errors.

Test networking thoroughly in development environments before production deployment.

## Conclusion

Debugging Windows container networking requires understanding both Kubernetes networking concepts and Windows-specific networking components like HNS. By systematically checking connectivity, DNS, CNI plugins, and service discovery, you can isolate and resolve most networking issues.

Start with basic connectivity tests and progressively move to more advanced diagnostics like packet captures and HNS inspection. Building familiarity with these tools and techniques reduces troubleshooting time and improves reliability of Windows workloads on Kubernetes.
