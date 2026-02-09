# How to Debug Windows Pod CrashLoopBackOff and Event Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Troubleshooting

Description: Complete troubleshooting guide for debugging Windows pods stuck in CrashLoopBackOff state with Windows Event Log analysis and diagnostic techniques.

---

CrashLoopBackOff is one of the most frustrating states for Kubernetes pods. When a Windows pod enters this state, it indicates the container repeatedly crashes and Kubernetes backs off restart attempts. Debugging Windows pods requires different techniques than Linux containers due to Windows-specific logging and error handling. This guide covers systematic troubleshooting approaches for Windows pod crashes.

## Understanding CrashLoopBackOff

When a Windows container exits with a non-zero code or crashes, Kubernetes automatically restarts it. If crashes continue, Kubernetes increases the delay between restart attempts exponentially, up to 5 minutes. This is the CrashLoopBackOff state.

Common causes include application errors, missing dependencies, misconfigured environment variables, insufficient resources, permission issues, or incompatible Windows versions.

## Initial Diagnostics

Start with basic kubectl commands:

```bash
# Check pod status
kubectl get pods

# Describe the pod for events and state
kubectl describe pod <pod-name>

# View pod logs (may be empty if crash happens immediately)
kubectl logs <pod-name>

# View logs from previous container instance
kubectl logs <pod-name> --previous

# Check events in the namespace
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>
```

Look for these key indicators in the output:

```bash
# Example output showing CrashLoopBackOff
NAME                     READY   STATUS             RESTARTS   AGE
windows-app-xyz          0/1     CrashLoopBackOff   5          10m

# Events might show:
Back-off restarting failed container
Container failed with exit code 1
```

## Analyzing Container Exit Codes

Check the actual exit code:

```yaml
# check-exit-code.yaml
apiVersion: v1
kind: Pod
metadata:
  name: exit-code-checker
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
      # Capture and log exit codes
      try {
        # Your application code here
        Start-Process -FilePath "C:\app\myapp.exe" -Wait -PassThru |
          ForEach-Object {
            Write-Host "Process exited with code: $($_.ExitCode)"
            exit $_.ExitCode
          }
      }
      catch {
        Write-Host "Error: $_"
        Write-Host "Stack trace: $($_.ScriptStackTrace)"
        exit 1
      }
```

Common Windows exit codes:

- 0: Success
- 1: General error
- 3: Path not found
- 5: Access denied
- 1073741502 (0xC000013A): Application terminated by Ctrl+C
- 3221225477 (0xC0000005): Access violation

## Accessing Windows Event Logs

Windows Event Logs contain critical debugging information:

```bash
# Get Windows Event Logs from a running pod
kubectl exec <pod-name> -- powershell -Command "Get-WinEvent -LogName Application -MaxEvents 50 | Format-List"

# View System event logs
kubectl exec <pod-name> -- powershell -Command "Get-WinEvent -LogName System -MaxEvents 50 | Format-List"

# Filter for errors only
kubectl exec <pod-name> -- powershell -Command "Get-WinEvent -LogName Application -MaxEvents 100 | Where-Object {$_.LevelDisplayName -eq 'Error'} | Format-Table TimeCreated, Id, Message -AutoSize"
```

For pods that crash too quickly to exec:

```yaml
# event-log-exporter.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-app-debug
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: myregistry.azurecr.io/app:v1
    command:
    - powershell.exe
    - -Command
    - |
      # Wrapper script that captures event logs before exit
      $ErrorActionPreference = "Continue"

      # Start logging event logs to stdout
      Start-Job -ScriptBlock {
        while ($true) {
          Get-WinEvent -LogName Application -MaxEvents 10 |
            Where-Object {$_.TimeCreated -gt (Get-Date).AddSeconds(-60)} |
            ForEach-Object {
              Write-Host "[$($_.TimeCreated)] [$($_.LevelDisplayName)] $($_.Message)"
            }
          Start-Sleep -Seconds 10
        }
      }

      # Run the actual application
      try {
        & C:\app\myapp.exe
      }
      catch {
        Write-Host "FATAL ERROR: $_"
        Get-WinEvent -LogName Application -MaxEvents 50 | Format-List
        exit 1
      }
```

## Debugging Missing Dependencies

Check for missing DLLs or dependencies:

```yaml
# dependency-check.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dependency-debug
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: checker
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "Checking application dependencies..."

      # Check if executable exists
      $appPath = "C:\app\myapp.exe"
      if (-not (Test-Path $appPath)) {
        Write-Host "ERROR: Application not found at $appPath"
        Get-ChildItem C:\app -Recurse
        exit 1
      }

      # Use dumpbin or dependency walker (if available)
      # For production, use PowerShell to check DLLs
      try {
        $assembly = [System.Reflection.Assembly]::LoadFile($appPath)
        Write-Host "Assembly loaded successfully: $($assembly.FullName)"
      }
      catch {
        Write-Host "Failed to load assembly: $_"

        # Check for missing DLLs
        $dependencies = @(
          "msvcr120.dll",
          "msvcp120.dll",
          "vcruntime140.dll",
          "ucrtbase.dll"
        )

        foreach ($dll in $dependencies) {
          $found = Get-ChildItem -Path C:\Windows\System32 -Filter $dll -ErrorAction SilentlyContinue
          if ($found) {
            Write-Host "FOUND: $dll"
          } else {
            Write-Host "MISSING: $dll"
          }
        }
        exit 1
      }

      # Check .NET Framework version
      $dotNetVersion = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP' -Recurse |
        Get-ItemProperty -Name Version -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Version
      Write-Host ".NET Framework versions: $dotNetVersion"

      # Now run the application
      & $appPath
```

## Debugging Configuration Issues

Validate environment variables and configuration:

```yaml
# config-debug.yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-debug
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: myregistry.azurecr.io/app:v1
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "=== Environment Variables ==="
      Get-ChildItem Env: | Format-Table Name, Value -AutoSize

      Write-Host "`n=== Required Configuration Check ==="
      $requiredVars = @("DATABASE_URL", "API_KEY", "APP_ENV")

      $missing = @()
      foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
          Write-Host "MISSING: $var"
          $missing += $var
        } else {
          $masked = if ($var -like "*KEY*" -or $var -like "*PASSWORD*" -or $var -like "*SECRET*") {
            "***REDACTED***"
          } else {
            $value
          }
          Write-Host "OK: $var = $masked"
        }
      }

      if ($missing.Count -gt 0) {
        Write-Host "`nERROR: Missing required environment variables: $($missing -join ', ')"
        exit 1
      }

      Write-Host "`n=== File System Check ==="
      $requiredPaths = @("C:\app\config.json", "C:\app\myapp.exe")
      foreach ($path in $requiredPaths) {
        if (Test-Path $path) {
          Write-Host "OK: $path exists"
        } else {
          Write-Host "ERROR: $path not found"
          exit 1
        }
      }

      Write-Host "`n=== Starting Application ==="
      & C:\app\myapp.exe
    env:
    - name: DATABASE_URL
      value: "server=db;database=app"
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: api-key
    - name: APP_ENV
      value: "production"
```

## Debugging Resource Issues

Check if crashes are caused by resource limits:

```yaml
# resource-debug.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-debug
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
      Write-Host "=== System Resources ==="

      # Memory
      $os = Get-WmiObject Win32_OperatingSystem
      $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
      $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
      Write-Host "Total Memory: $totalMem GB"
      Write-Host "Free Memory: $freeMem GB"

      # CPU
      Write-Host "CPU Count: $env:NUMBER_OF_PROCESSORS"

      # Disk
      $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
      $diskFree = [math]::Round($disk.FreeSpace / 1GB, 2)
      Write-Host "Free Disk Space: $diskFree GB"

      # Monitor resources while app runs
      $job = Start-Job -ScriptBlock {
        param($appPath)
        & $appPath
      } -ArgumentList "C:\app\myapp.exe"

      while ($job.State -eq 'Running') {
        $proc = Get-Process -Id $job.Id -ErrorAction SilentlyContinue
        if ($proc) {
          $mem = [math]::Round($proc.WorkingSet64 / 1MB, 2)
          $cpu = $proc.CPU
          Write-Host "App Memory: $mem MB | CPU Time: $cpu seconds"
        }
        Start-Sleep -Seconds 5
      }

      $result = Receive-Job $job
      $exitCode = $job.ChildJobs[0].Output[-1]
      Write-Host "Application exited with code: $exitCode"
      exit $exitCode
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
```

Check for OOM kills:

```bash
# Check if pod was killed due to OOM
kubectl describe pod <pod-name> | grep -i "OOMKilled"

# View container status
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
```

## Debugging Permission Issues

Windows containers have specific permission requirements:

```yaml
# permission-debug.yaml
apiVersion: v1
kind: Pod
metadata:
  name: permission-debug
spec:
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      runAsUserName: "ContainerAdministrator"
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      Write-Host "=== User Context ==="
      Write-Host "Current User: $env:USERNAME"
      Write-Host "User Domain: $env:USERDOMAIN"
      whoami /all

      Write-Host "`n=== File Permissions ==="
      $testPath = "C:\app\data"
      try {
        # Try to create directory
        New-Item -Path $testPath -ItemType Directory -Force
        Write-Host "OK: Can create directory at $testPath"

        # Try to write file
        Set-Content -Path "$testPath\test.txt" -Value "test"
        Write-Host "OK: Can write files to $testPath"

        # Try to read file
        Get-Content "$testPath\test.txt"
        Write-Host "OK: Can read files from $testPath"

        # Check ACLs
        Get-Acl $testPath | Format-List
      }
      catch {
        Write-Host "ERROR: Permission denied: $_"
        exit 1
      }

      Write-Host "`n=== Registry Access ==="
      try {
        $regPath = "HKLM:\Software\MyApp"
        New-Item -Path $regPath -Force | Out-Null
        Set-ItemProperty -Path $regPath -Name "TestKey" -Value "TestValue"
        Write-Host "OK: Can access registry"
      }
      catch {
        Write-Host "ERROR: Cannot access registry: $_"
      }
```

## Creating a Debug Container

Create a debug container for interactive troubleshooting:

```yaml
# debug-container.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-debug-shell
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: debug
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -NoExit
    - -Command
    - |
      Write-Host "Debug shell started. Available tools:"
      Write-Host "  - Event Logs: Get-WinEvent"
      Write-Host "  - Processes: Get-Process"
      Write-Host "  - Network: Test-NetConnection"
      Write-Host "  - Registry: Get-ItemProperty"
      Write-Host ""
      Write-Host "Press Ctrl+C to exit"

      # Keep container running
      while ($true) { Start-Sleep -Seconds 3600 }
    stdin: true
    tty: true
```

Attach to the debug container:

```bash
kubectl exec -it windows-debug-shell -- powershell

# Inside the container, run diagnostics
PS> Get-WinEvent -LogName Application -MaxEvents 20
PS> Get-Process
PS> Test-NetConnection google.com -Port 443
PS> ipconfig /all
```

## Systematic Troubleshooting Checklist

Use this checklist for debugging:

1. Check pod events: `kubectl describe pod <pod-name>`
2. View current logs: `kubectl logs <pod-name>`
3. View previous logs: `kubectl logs <pod-name> --previous`
4. Check exit code in pod status
5. Verify image exists and is correct version
6. Check resource limits (CPU/memory)
7. Validate environment variables
8. Confirm Windows version compatibility
9. Check Windows Event Logs
10. Verify file permissions
11. Test network connectivity
12. Check for missing dependencies

## Conclusion

Debugging Windows pods in CrashLoopBackOff requires systematic investigation of logs, events, configuration, and resources. Windows Event Logs provide detailed error information not available in container logs. Always check previous container logs, validate environment configuration, ensure sufficient resources, and verify Windows version compatibility.

Create debug wrappers that capture diagnostic information before crashes occur. Use event log analysis to identify Windows-specific issues. With proper debugging techniques, you can quickly identify and resolve Windows container crashes in Kubernetes.
