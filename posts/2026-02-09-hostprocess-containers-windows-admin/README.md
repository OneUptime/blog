# How to Use HostProcess Containers for Windows Node Administration Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Containers

Description: Learn how to use HostProcess containers to perform privileged administrative tasks on Windows nodes directly from Kubernetes pods.

---

HostProcess containers are a powerful Windows feature that allows containers to run with elevated privileges and access to the host operating system. Unlike standard Windows containers that run isolated from the host, HostProcess containers run in the host's process namespace with full access to the Windows node. This capability enables system administration tasks, monitoring agents, and security tools to run as Kubernetes workloads. This guide explains how to use HostProcess containers safely and effectively.

## Understanding HostProcess Containers

Traditional Windows containers run in isolated environments with limited access to the host system. This isolation provides security but prevents certain administrative tasks. HostProcess containers break this isolation intentionally, running processes directly on the Windows host with SYSTEM privileges.

HostProcess containers are ideal for tasks that require host-level access such as installing software, configuring Windows services, managing networking, monitoring system metrics, or performing security scans. They run as regular Windows processes, not in container isolation, but Kubernetes manages their lifecycle.

This feature requires Kubernetes 1.22 or later with Windows Server 2019 or newer. The containerd runtime must support HostProcess containers.

## Enabling HostProcess Container Support

First, verify your cluster supports HostProcess containers:

```bash
# Check Kubernetes version (must be 1.22+)
kubectl version --short

# Verify feature gate is enabled (enabled by default in 1.23+)
kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kubeletVersion}'
```

On Windows nodes, verify containerd supports HostProcess:

```powershell
# Check containerd version
containerd.exe --version

# Verify HostProcess support in containerd config
Get-Content C:\ProgramData\containerd\config.toml | Select-String -Pattern "hostprocess"
```

## Creating a Basic HostProcess Container

Here's a simple HostProcess container that runs a PowerShell command:

```yaml
# hostprocess-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostprocess-example
  namespace: default
spec:
  # Required: Enable host network
  hostNetwork: true

  # Security context for Windows HostProcess
  securityContext:
    windowsOptions:
      hostProcess: true
      runAsUserName: "NT AUTHORITY\\SYSTEM"

  # HostProcess containers must run on Windows
  nodeSelector:
    kubernetes.io/os: windows

  # Host process containers require hostNetwork
  # and cannot use init containers
  containers:
  - name: admin-task
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "Running as HostProcess container"
      Write-Host "User: $env:USERNAME"
      Write-Host "Computer: $env:COMPUTERNAME"

      # Access host filesystem
      Get-ChildItem C:\Windows\System32 | Select-Object -First 10

      # View running services
      Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 10

      # Keep container running
      Start-Sleep -Seconds 3600
```

Apply and verify:

```bash
kubectl apply -f hostprocess-example.yaml

# Check pod status
kubectl get pod hostprocess-example

# View logs
kubectl logs hostprocess-example

# Execute commands on the host
kubectl exec hostprocess-example -- powershell -Command "Get-Process | Select-Object -First 5"
```

## Installing Software on Windows Nodes

Use HostProcess containers to install software across Windows nodes:

```yaml
# install-software.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: install-monitoring-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: monitoring-installer
  template:
    metadata:
      labels:
        app: monitoring-installer
    spec:
      hostNetwork: true
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: installer
        image: mcr.microsoft.com/windows/servercore:ltsc2022
        command:
        - powershell.exe
        - -Command
        - |
          $agentInstalled = Test-Path "C:\Program Files\MonitoringAgent\agent.exe"

          if (-not $agentInstalled) {
            Write-Host "Installing monitoring agent..."

            # Download installer
            Invoke-WebRequest -Uri "https://example.com/agent-installer.msi" `
              -OutFile "C:\Windows\Temp\agent-installer.msi"

            # Install silently
            Start-Process msiexec.exe -ArgumentList @(
              '/i',
              'C:\Windows\Temp\agent-installer.msi',
              '/quiet',
              '/norestart',
              'INSTALLDIR="C:\Program Files\MonitoringAgent"'
            ) -Wait

            Write-Host "Agent installed successfully"

            # Configure agent
            $config = @"
            server: monitoring.example.com
            port: 8443
            node_name: $env:COMPUTERNAME
            "@
            $config | Out-File -FilePath "C:\Program Files\MonitoringAgent\config.yaml"

            # Start agent service
            New-Service -Name "MonitoringAgent" `
              -BinaryPathName "C:\Program Files\MonitoringAgent\agent.exe" `
              -StartupType Automatic
            Start-Service MonitoringAgent
          } else {
            Write-Host "Monitoring agent already installed"
          }

          # Keep container running to maintain DaemonSet
          while ($true) {
            Start-Sleep -Seconds 60
            # Health check
            $service = Get-Service MonitoringAgent -ErrorAction SilentlyContinue
            if ($service.Status -ne 'Running') {
              Write-Host "Agent not running, attempting restart..."
              Start-Service MonitoringAgent
            }
          }
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Deploy the DaemonSet:

```bash
kubectl apply -f install-software.yaml

# Verify DaemonSet is running on all Windows nodes
kubectl get daemonset -n kube-system install-monitoring-agent

# Check installation logs
kubectl logs -n kube-system -l app=monitoring-installer --tail=50
```

## Configuring Windows Firewall Rules

Use HostProcess containers to manage Windows Firewall:

```yaml
# configure-firewall.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: configure-firewall
  namespace: kube-system
spec:
  template:
    spec:
      hostNetwork: true
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      nodeSelector:
        kubernetes.io/os: windows
      restartPolicy: OnFailure
      containers:
      - name: firewall-config
        image: mcr.microsoft.com/windows/nanoserver:ltsc2022
        command:
        - powershell.exe
        - -Command
        - |
          Write-Host "Configuring Windows Firewall rules..."

          # Allow Kubernetes API traffic
          New-NetFirewallRule -DisplayName "Kubernetes API" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 10250 `
            -Action Allow `
            -ErrorAction SilentlyContinue

          # Allow CNI plugin traffic
          New-NetFirewallRule -DisplayName "CNI VXLAN" `
            -Direction Inbound `
            -Protocol UDP `
            -LocalPort 4789 `
            -Action Allow `
            -ErrorAction SilentlyContinue

          # Allow NodePort range
          New-NetFirewallRule -DisplayName "Kubernetes NodePorts" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 30000-32767 `
            -Action Allow `
            -ErrorAction SilentlyContinue

          # Block unauthorized outbound traffic
          New-NetFirewallRule -DisplayName "Block Metadata Service" `
            -Direction Outbound `
            -RemoteAddress 169.254.169.254 `
            -Action Block `
            -ErrorAction SilentlyContinue

          Write-Host "Firewall rules configured"

          # Display configured rules
          Get-NetFirewallRule | Where-Object {$_.DisplayName -like "Kubernetes*"} |
            Format-Table DisplayName, Direction, Action -AutoSize
```

## Collecting System Metrics

Create a metrics collection container:

```yaml
# metrics-collector.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-metrics-collector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: metrics-collector
  template:
    metadata:
      labels:
        app: metrics-collector
    spec:
      hostNetwork: true
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: collector
        image: mcr.microsoft.com/windows/servercore:ltsc2022
        command:
        - powershell.exe
        - -Command
        - |
          while ($true) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

            # CPU metrics
            $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
            $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)

            # Memory metrics
            $mem = Get-WmiObject Win32_OperatingSystem
            $totalMem = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
            $freeMem = [math]::Round($mem.FreePhysicalMemory / 1MB, 2)
            $usedMem = [math]::Round($totalMem - $freeMem, 2)

            # Disk metrics
            $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
            $diskTotal = [math]::Round($disk.Size / 1GB, 2)
            $diskFree = [math]::Round($disk.FreeSpace / 1GB, 2)
            $diskUsed = [math]::Round($diskTotal - $diskFree, 2)

            # Network metrics
            $net = Get-Counter '\Network Interface(*)\Bytes Total/sec' -SampleInterval 1 -MaxSamples 1
            $netBytes = [math]::Round($net.CounterSamples[0].CookedValue / 1MB, 2)

            # Container metrics
            $containers = docker ps --format "{{.Names}}" 2>$null | Measure-Object
            $containerCount = $containers.Count

            # Format as Prometheus metrics
            $metrics = @"
            # HELP node_cpu_usage CPU usage percentage
            # TYPE node_cpu_usage gauge
            node_cpu_usage{node="$env:COMPUTERNAME"} $cpuUsage

            # HELP node_memory_used_gb Memory used in GB
            # TYPE node_memory_used_gb gauge
            node_memory_used_gb{node="$env:COMPUTERNAME"} $usedMem

            # HELP node_disk_used_gb Disk used in GB
            # TYPE node_disk_used_gb gauge
            node_disk_used_gb{node="$env:COMPUTERNAME"} $diskUsed

            # HELP node_network_bytes_per_sec Network throughput
            # TYPE node_network_bytes_per_sec gauge
            node_network_bytes_per_sec{node="$env:COMPUTERNAME"} $netBytes

            # HELP node_containers_running Running container count
            # TYPE node_containers_running gauge
            node_containers_running{node="$env:COMPUTERNAME"} $containerCount
            "@

            Write-Host "[$timestamp] CPU: $cpuUsage% | Memory: $usedMem GB | Disk: $diskUsed GB | Containers: $containerCount"

            # Expose metrics on HTTP endpoint (simplified example)
            # In production, use a proper metrics server

            Start-Sleep -Seconds 15
          }
        ports:
        - containerPort: 9100
          name: metrics
        resources:
          limits:
            memory: "256Mi"
            cpu: "200m"
```

## Managing Windows Services

Control Windows services from HostProcess containers:

```yaml
# service-manager.yaml
apiVersion: v1
kind: Pod
metadata:
  name: service-manager
spec:
  hostNetwork: true
  securityContext:
    windowsOptions:
      hostProcess: true
      runAsUserName: "NT AUTHORITY\\SYSTEM"
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: manager
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      function Manage-WindowsService {
        param(
          [string]$ServiceName,
          [string]$Action
        )

        $service = Get-Service $ServiceName -ErrorAction SilentlyContinue

        if ($null -eq $service) {
          Write-Host "Service $ServiceName not found"
          return
        }

        switch ($Action) {
          "start" {
            if ($service.Status -ne 'Running') {
              Start-Service $ServiceName
              Write-Host "Started $ServiceName"
            }
          }
          "stop" {
            if ($service.Status -eq 'Running') {
              Stop-Service $ServiceName
              Write-Host "Stopped $ServiceName"
            }
          }
          "restart" {
            Restart-Service $ServiceName
            Write-Host "Restarted $ServiceName"
          }
          "status" {
            Write-Host "$ServiceName is $($service.Status)"
          }
        }
      }

      # Ensure critical services are running
      $criticalServices = @('kubelet', 'containerd', 'docker')

      foreach ($svc in $criticalServices) {
        Manage-WindowsService -ServiceName $svc -Action "status"
        Manage-WindowsService -ServiceName $svc -Action "start"
      }

      # Monitor services
      while ($true) {
        foreach ($svc in $criticalServices) {
          $service = Get-Service $svc -ErrorAction SilentlyContinue
          if ($service -and $service.Status -ne 'Running') {
            Write-Host "WARNING: $svc is not running. Attempting restart..."
            Manage-WindowsService -ServiceName $svc -Action "start"
          }
        }
        Start-Sleep -Seconds 30
      }
```

## Security Considerations

HostProcess containers run with SYSTEM privileges and full host access. Implement security controls:

```yaml
# secured-hostprocess.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secured-hostprocess
  namespace: admin
spec:
  hostNetwork: true
  securityContext:
    windowsOptions:
      hostProcess: true
      runAsUserName: "NT AUTHORITY\\SYSTEM"
  nodeSelector:
    kubernetes.io/os: windows
    node-role.kubernetes.io/admin: "true"  # Run only on designated nodes
  serviceAccountName: hostprocess-admin  # Use dedicated service account
  containers:
  - name: admin
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      # Audit all actions
      $AuditLog = "C:\Windows\Temp\hostprocess-audit.log"

      function Write-Audit {
        param([string]$Message)
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "$timestamp - $Message" | Out-File -FilePath $AuditLog -Append
        Write-Host $Message
      }

      Write-Audit "HostProcess container started"
      Write-Audit "Running as: $env:USERNAME"

      # Perform administrative tasks here
      # All actions are logged

      Write-Audit "HostProcess container tasks completed"
      Start-Sleep -Seconds 3600
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
```

Create RBAC for HostProcess pods:

```yaml
# hostprocess-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hostprocess-admin
  namespace: admin
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hostprocess-admin-role
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hostprocess-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hostprocess-admin-role
subjects:
- kind: ServiceAccount
  name: hostprocess-admin
  namespace: admin
```

## Troubleshooting HostProcess Containers

Common issues and solutions:

```bash
# Check if pod is actually running as HostProcess
kubectl describe pod hostprocess-example | grep -A 10 "Security Context"

# View HostProcess container logs
kubectl logs hostprocess-example

# Verify host network is enabled
kubectl get pod hostprocess-example -o jsonpath='{.spec.hostNetwork}'

# Check node compatibility
kubectl get nodes -o custom-columns=NAME:.metadata.name,OS:.status.nodeInfo.operatingSystem,VERSION:.status.nodeInfo.kubeletVersion
```

Inside the container, verify host access:

```powershell
# Verify running as SYSTEM
kubectl exec hostprocess-example -- powershell -Command "whoami"

# Check host filesystem access
kubectl exec hostprocess-example -- powershell -Command "Get-ChildItem C:\"

# Verify host network namespace
kubectl exec hostprocess-example -- powershell -Command "Get-NetAdapter"
```

## Conclusion

HostProcess containers provide powerful administrative capabilities for Windows nodes in Kubernetes. They enable system-level tasks, monitoring, and configuration management through the familiar Kubernetes API. However, with great power comes great responsibility. Always use HostProcess containers judiciously, implement proper security controls, limit access through RBAC, and thoroughly audit all operations.

For most workloads, standard containers provide sufficient isolation and should be preferred. Reserve HostProcess containers for legitimate administrative tasks that truly require host-level access. With proper safeguards in place, HostProcess containers become a valuable tool for managing Windows infrastructure in Kubernetes.
