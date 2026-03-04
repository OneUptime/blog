# How to Configure Windows Pod Resource Limits for CPU and Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Resources

Description: Learn how to properly configure CPU and memory resource requests and limits for Windows pods in Kubernetes with best practices and troubleshooting tips.

---

Resource management is critical for stable Kubernetes clusters. Windows containers have different resource characteristics than Linux containers, requiring special attention to CPU and memory configuration. Improperly configured resources can lead to node instability, application crashes, or inefficient resource utilization. This guide explains how to configure resource limits for Windows pods and avoid common pitfalls.

## Understanding Windows Resource Management

Windows containers use the Windows Host Compute Service (HCS) for resource isolation and limitation. Unlike Linux cgroups, Windows uses job objects and resource controls that behave differently in several ways.

CPU limits in Windows containers are enforced as a percentage of total CPU time rather than CPU shares. Memory limits trigger out-of-memory kills similar to Linux but with different timing characteristics due to Windows memory management.

Windows containers typically require more base memory than equivalent Linux containers due to the Windows kernel overhead. A minimal Windows Server Core container needs around 200-300 MB just for the operating system before your application loads.

## Setting Basic Resource Requests and Limits

Start with a basic pod configuration:

```yaml
# windows-resource-limits.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-app-with-limits
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "Starting application..."
      Write-Host "Allocated Memory: $((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB) GB"
      Write-Host "CPU Count: $env:NUMBER_OF_PROCESSORS"
      Start-Sleep -Seconds 3600
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
```

The `requests` define the guaranteed resources, while `limits` define the maximum the container can use.

## Calculating Appropriate Resource Requests

Determine baseline resource needs for your Windows application:

```yaml
# resource-testing-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-test
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: monitor
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      $duration = 300  # Monitor for 5 minutes
      $interval = 5
      $samples = $duration / $interval

      Write-Host "Monitoring resource usage for $duration seconds..."
      $cpuSamples = @()
      $memSamples = @()

      for ($i = 0; $i -lt $samples; $i++) {
        # CPU usage
        $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
        $cpuPercent = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)
        $cpuSamples += $cpuPercent

        # Memory usage
        $mem = Get-WmiObject Win32_Process -Filter "ProcessId = $PID"
        $memMB = [math]::Round($mem.WorkingSetSize / 1MB, 2)
        $memSamples += $memMB

        Write-Host "[$i] CPU: $cpuPercent% | Memory: $memMB MB"
        Start-Sleep -Seconds $interval
      }

      # Calculate statistics
      $avgCPU = ($cpuSamples | Measure-Object -Average).Average
      $maxCPU = ($cpuSamples | Measure-Object -Maximum).Maximum
      $avgMem = ($memSamples | Measure-Object -Average).Average
      $maxMem = ($memSamples | Measure-Object -Maximum).Maximum

      Write-Host "`nResource Usage Summary:"
      Write-Host "CPU - Avg: $avgCPU% | Max: $maxCPU%"
      Write-Host "Memory - Avg: $avgMem MB | Max: $maxMem MB"
      Write-Host "`nRecommended Settings:"
      Write-Host "  requests:"
      Write-Host "    cpu: $([math]::Round($avgCPU * 10, 0))m"
      Write-Host "    memory: $([math]::Round($avgMem * 1.2, 0))Mi"
      Write-Host "  limits:"
      Write-Host "    cpu: $([math]::Round($maxCPU * 10, 0))m"
      Write-Host "    memory: $([math]::Round($maxMem * 1.5, 0))Mi"
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "4Gi"
        cpu: "2000m"
```

Run the test and use the output to configure your production pods.

## Configuring CPU Resources

CPU resources for Windows pods use millicores (1000m = 1 CPU):

```yaml
# cpu-configurations.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cpu-intensive-app
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: worker
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      # CPU-intensive workload
      $scriptBlock = {
        $result = 0
        for ($i = 0; $i -lt 1000000; $i++) {
          $result += [Math]::Sqrt($i)
        }
        return $result
      }

      while ($true) {
        # Run parallel jobs based on CPU allocation
        $jobs = @()
        for ($i = 0; $i -lt 4; $i++) {
          $jobs += Start-Job -ScriptBlock $scriptBlock
        }

        $jobs | Wait-Job | Receive-Job | Out-Null
        $jobs | Remove-Job

        Write-Host "Completed CPU-intensive cycle at $(Get-Date)"
        Start-Sleep -Seconds 10
      }
    resources:
      requests:
        cpu: "1000m"  # Guaranteed 1 CPU
      limits:
        cpu: "2000m"  # Can burst to 2 CPUs
```

Understanding CPU behavior:

```yaml
# Different CPU configurations
apiVersion: v1
kind: Pod
metadata:
  name: cpu-scenarios
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  # Scenario 1: Low CPU, no bursting
  - name: low-cpu
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    resources:
      requests:
        cpu: "100m"
      limits:
        cpu: "100m"  # Same as request = no bursting

  # Scenario 2: Moderate CPU with bursting
  - name: burstable-cpu
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    resources:
      requests:
        cpu: "250m"
      limits:
        cpu: "1000m"  # Can burst 4x during peaks

  # Scenario 3: Guaranteed CPU
  - name: guaranteed-cpu
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    resources:
      requests:
        cpu: "2000m"
      limits:
        cpu: "2000m"  # Guaranteed, no sharing
```

## Configuring Memory Resources

Memory limits are critical for Windows containers:

```yaml
# memory-configurations.yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-tiers
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  # Small application (IIS static site)
  - name: small-app
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    resources:
      requests:
        memory: "512Mi"
      limits:
        memory: "1Gi"

  # Medium application (.NET service)
  - name: medium-app
    image: myregistry.azurecr.io/dotnet-service:v1
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "2Gi"

  # Large application (SQL Server)
  - name: large-app
    image: mcr.microsoft.com/mssql/server:2022-latest
    resources:
      requests:
        memory: "4Gi"
      limits:
        memory: "8Gi"
```

## Monitoring Resource Usage

Create a monitoring pod to track resource consumption:

```yaml
# resource-monitor.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-monitor
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: monitor
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      while ($true) {
        Clear-Host
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "=== Resource Monitor - $timestamp ==="
        Write-Host ""

        # CPU Usage
        $cpu = Get-Counter '\Processor(_Total)\% Processor Time'
        $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)
        Write-Host "CPU Usage: $cpuUsage%"

        # Memory Usage
        $os = Get-WmiObject Win32_OperatingSystem
        $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
        $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
        $usedMem = $totalMem - $freeMem
        $memPercent = [math]::Round(($usedMem / $totalMem) * 100, 2)

        Write-Host "Memory: $usedMem GB / $totalMem GB ($memPercent%)"

        # Process-level metrics
        $process = Get-WmiObject Win32_Process -Filter "ProcessId = $PID"
        $procMem = [math]::Round($process.WorkingSetSize / 1MB, 2)
        Write-Host "Process Memory: $procMem MB"

        # Available resources
        Write-Host ""
        Write-Host "Available Resources:"
        Write-Host "  CPUs: $env:NUMBER_OF_PROCESSORS"
        Write-Host "  Free Memory: $freeMem GB"

        Start-Sleep -Seconds 10
      }
```

Check resource usage from kubectl:

```bash
# View resource usage
kubectl top pod <pod-name>

# View node resource allocation
kubectl top nodes

# Describe pod to see limits
kubectl describe pod <pod-name> | grep -A 5 "Limits:"

# Check for OOM kills
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}{end}' | grep OOMKilled
```

## Handling Out of Memory Situations

Configure memory limits to prevent OOM kills:

```yaml
# oom-prevention.yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-managed-app
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      # Monitor memory and manage allocation
      $maxMemoryMB = 1536  # Leave headroom below 2GB limit

      function Get-MemoryUsage {
        $proc = Get-WmiObject Win32_Process -Filter "ProcessId = $PID"
        return [math]::Round($proc.WorkingSetSize / 1MB, 2)
      }

      while ($true) {
        $currentMem = Get-MemoryUsage

        if ($currentMem -gt ($maxMemoryMB * 0.9)) {
          Write-Host "WARNING: Memory usage at $currentMem MB, approaching limit"

          # Trigger garbage collection
          [System.GC]::Collect()
          [System.GC]::WaitForPendingFinalizers()
          [System.GC]::Collect()

          $newMem = Get-MemoryUsage
          Write-Host "After GC: $newMem MB"
        }

        # Your application logic here
        Write-Host "Memory: $currentMem MB"
        Start-Sleep -Seconds 60
      }
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "2Gi"  # Hard limit
```

## Quality of Service Classes

Kubernetes assigns QoS classes based on resource configuration:

```yaml
# qos-examples.yaml
# Guaranteed QoS - requests = limits
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-qos
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "1Gi"  # Same as request
        cpu: "500m"    # Same as request
---
# Burstable QoS - has requests, limits > requests
apiVersion: v1
kind: Pod
metadata:
  name: burstable-qos
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "2Gi"   # Higher than request
        cpu: "1000m"    # Higher than request
---
# BestEffort QoS - no requests or limits
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-qos
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep 3600"]
    # No resources specified
```

Check QoS class:

```bash
kubectl get pod guaranteed-qos -o jsonpath='{.status.qosClass}'
kubectl get pod burstable-qos -o jsonpath='{.status.qosClass}'
kubectl get pod besteffort-qos -o jsonpath='{.status.qosClass}'
```

## Resource Quotas for Windows Namespaces

Limit total resources in a namespace:

```yaml
# windows-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: windows-compute-quota
  namespace: windows-apps
spec:
  hard:
    requests.cpu: "20"      # Total CPU requests
    requests.memory: "40Gi" # Total memory requests
    limits.cpu: "40"        # Total CPU limits
    limits.memory: "80Gi"   # Total memory limits
    pods: "50"              # Max number of pods
---
# Limit ranges for defaults
apiVersion: v1
kind: LimitRange
metadata:
  name: windows-limit-range
  namespace: windows-apps
spec:
  limits:
  - max:
      memory: "8Gi"
      cpu: "4"
    min:
      memory: "256Mi"
      cpu: "100m"
    default:
      memory: "1Gi"
      cpu: "500m"
    defaultRequest:
      memory: "512Mi"
      cpu: "250m"
    type: Container
```

## Best Practices for Windows Resource Configuration

Follow these guidelines:

1. Always set both requests and limits for production workloads
2. Leave at least 20% headroom between requests and limits for bursting
3. Account for Windows OS overhead (minimum 200-300 MB)
4. Test resource usage under load before deploying to production
5. Monitor OOMKilled events and adjust limits accordingly
6. Use Guaranteed QoS for critical applications
7. Implement application-level memory management
8. Set appropriate resource quotas at namespace level

```yaml
# Production-ready configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: prod-app
  template:
    metadata:
      labels:
        app: prod-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/app:v1
        resources:
          requests:
            memory: "2Gi"    # 80% of limit
            cpu: "1000m"     # 50% of limit
          limits:
            memory: "2.5Gi"  # Allows some bursting
            cpu: "2000m"     # Allows CPU bursting
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Conclusion

Proper resource configuration is essential for stable Windows containers in Kubernetes. Windows containers have higher base resource requirements than Linux containers, so always account for OS overhead when setting limits. Monitor resource usage in production, adjust limits based on actual consumption, and use resource quotas to prevent resource exhaustion at the namespace level.

Start conservatively with higher limits, then optimize based on observed behavior. Implement application-level monitoring and memory management to complement Kubernetes resource controls. With proper configuration, Windows pods can run reliably alongside Linux workloads in mixed-OS clusters.
