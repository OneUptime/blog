# How to Configure Kubernetes Probes for Windows Containers with PowerShell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, PowerShell

Description: Implement liveness, readiness, and startup probes for Windows containers using PowerShell scripts and HTTP endpoints with best practices for reliable health checking.

---

Health probes are essential for Kubernetes to manage container lifecycle. Liveness probes detect when containers need restarting, readiness probes determine when containers can receive traffic, and startup probes handle slow-starting applications. For Windows containers, implementing probes requires PowerShell scripts or HTTP endpoints. This guide covers configuring effective health checks for Windows workloads.

## Understanding Kubernetes Probes

Kubernetes supports three probe types:

**Liveness probes** check if the application is running. If a liveness probe fails, Kubernetes restarts the container. Use for detecting deadlocks or crashed processes.

**Readiness probes** determine if the application can serve requests. Failed readiness probes remove the pod from service endpoints. Use when the application needs time to load data or establish connections before handling traffic.

**Startup probes** protect slow-starting containers from premature liveness probe failures. Once a startup probe succeeds, liveness and readiness probes take over.

## HTTP Probe Implementation

Create an HTTP health check endpoint in your application:

```csharp
// HealthCheckController.cs
using System;
using System.Net;
using System.Web.Http;

public class HealthController : ApiController
{
    [HttpGet]
    [Route("health/live")]
    public IHttpActionResult Liveness()
    {
        // Check if application is running
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    [HttpGet]
    [Route("health/ready")]
    public IHttpActionResult Readiness()
    {
        try
        {
            // Check database connectivity
            using (var db = new ApplicationDbContext())
            {
                db.Database.Connection.Open();
                db.Database.Connection.Close();
            }

            // Check external dependencies
            var apiAvailable = CheckExternalAPI();

            if (!apiAvailable)
            {
                return StatusCode(HttpStatusCode.ServiceUnavailable);
            }

            return Ok(new { status = "ready", timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            return Content(HttpStatusCode.ServiceUnavailable,
                new { status = "not ready", error = ex.Message });
        }
    }

    private bool CheckExternalAPI()
    {
        try
        {
            using (var client = new WebClient())
            {
                client.DownloadString("https://api.example.com/health");
                return true;
            }
        }
        catch
        {
            return false;
        }
    }
}
```

Configure HTTP probes in Kubernetes:

```yaml
# http-probe-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: myregistry.azurecr.io/webapp:v1
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /health/live
            port: 80
            scheme: HTTP
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health/live
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 30  # Allow 5 minutes for startup
```

## PowerShell Exec Probes

Use PowerShell scripts for exec-based health checks:

```yaml
# powershell-probe-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-service-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: service
  template:
    metadata:
      labels:
        app: service
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: service
        image: mcr.microsoft.com/windows/servercore:ltsc2022
        command:
        - powershell.exe
        - -Command
        - C:\app\service.exe
        livenessProbe:
          exec:
            command:
            - powershell.exe
            - -Command
            - |
              # Check if process is running
              $process = Get-Process -Name "service" -ErrorAction SilentlyContinue
              if ($null -eq $process) {
                exit 1
              }
              # Check if process is responding
              $cpu = $process.CPU
              if ($cpu -eq 0 -and $process.StartTime -lt (Get-Date).AddMinutes(-5)) {
                Write-Host "Process appears hung"
                exit 1
              }
              Write-Host "Process is healthy"
              exit 0
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - powershell.exe
            - -Command
            - |
              # Check if service is ready to handle requests
              try {
                $response = Invoke-WebRequest -Uri http://localhost:8080/api/ping -UseBasicParsing -TimeoutSec 3
                if ($response.StatusCode -eq 200) {
                  exit 0
                }
              } catch {
                Write-Host "Service not ready: $_"
                exit 1
              }
              exit 1
          initialDelaySeconds: 30
          periodSeconds: 10
```

## File-Based Health Checks

Create health check files:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: file-based-probe
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
      # Application startup
      Write-Host "Starting application..."

      # Create healthy status file
      Set-Content -Path C:\health\ready -Value "ok"

      # Main application loop
      while ($true) {
        try {
          # Do work
          Start-Sleep -Seconds 10

          # Update health status
          Set-Content -Path C:\health\ready -Value "ok"
        }
        catch {
          # Remove health file on error
          Remove-Item C:\health\ready -ErrorAction SilentlyContinue
          throw
        }
      }
    livenessProbe:
      exec:
        command:
        - powershell.exe
        - -Command
        - |
          if (Test-Path C:\health\ready) {
            exit 0
          }
          exit 1
      periodSeconds: 30
```

## Database Connectivity Probe

Check database connections:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-client
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/dbapp:v1
        env:
        - name: DB_CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connectionString
        readinessProbe:
          exec:
            command:
            - powershell.exe
            - -Command
            - |
              $connectionString = $env:DB_CONNECTION_STRING
              try {
                $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
                $connection.Open()
                $command = $connection.CreateCommand()
                $command.CommandText = "SELECT 1"
                $result = $command.ExecuteScalar()
                $connection.Close()

                if ($result -eq 1) {
                  Write-Host "Database connection successful"
                  exit 0
                }
              }
              catch {
                Write-Host "Database connection failed: $_"
                exit 1
              }
              exit 1
          initialDelaySeconds: 30
          periodSeconds: 15
```

## TCP Socket Probes

Check if a port is listening:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tcp-probe-example
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    ports:
    - containerPort: 8080
    livenessProbe:
      tcpSocket:
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 20
    readinessProbe:
      tcpSocket:
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
```

## Complex Health Check Logic

Implement sophisticated health checks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: complex-health-check
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: myregistry.azurecr.io/app:v1
    readinessProbe:
      exec:
        command:
        - powershell.exe
        - -Command
        - |
          $healthy = $true
          $checks = @()

          # Check 1: Process running
          $process = Get-Process -Name "myapp" -ErrorAction SilentlyContinue
          if ($null -eq $process) {
            $checks += "Process not running"
            $healthy = $false
          }

          # Check 2: Memory usage acceptable
          if ($process) {
            $memMB = $process.WorkingSet64 / 1MB
            if ($memMB -gt 1500) {
              $checks += "Memory usage too high: $memMB MB"
              $healthy = $false
            }
          }

          # Check 3: API responding
          try {
            $response = Invoke-RestMethod -Uri http://localhost:8080/api/status -TimeoutSec 3
            if ($response.status -ne "ok") {
              $checks += "API status not OK"
              $healthy = $false
            }
          }
          catch {
            $checks += "API not responding"
            $healthy = $false
          }

          # Check 4: Required files exist
          $requiredFiles = @("C:\app\config.json", "C:\app\data\cache.db")
          foreach ($file in $requiredFiles) {
            if (-not (Test-Path $file)) {
              $checks += "Missing file: $file"
              $healthy = $false
            }
          }

          # Check 5: Disk space
          $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
          $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
          if ($freeGB -lt 5) {
            $checks += "Low disk space: $freeGB GB"
            $healthy = $false
          }

          if ($healthy) {
            Write-Host "All health checks passed"
            exit 0
          }
          else {
            Write-Host "Health check failed:"
            $checks | ForEach-Object { Write-Host "  - $_" }
            exit 1
          }
      initialDelaySeconds: 45
      periodSeconds: 30
      timeoutSeconds: 10
```

## Probe Best Practices

Configure probe timing appropriately:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: optimized-probes
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/app:v1
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          # Give app up to 5 minutes to start
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          # Check every 30 seconds
          initialDelaySeconds: 0
          periodSeconds: 30
          timeoutSeconds: 5
          # Restart after 3 failures (90 seconds)
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          # Check frequently
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          # Remove from service after 1 failure
          failureThreshold: 1
          # Require 2 successes before adding to service
          successThreshold: 2
```

## Troubleshooting Failed Probes

Debug probe failures:

```bash
# View pod events
kubectl describe pod <pod-name> | grep -A 10 Events

# Check probe configuration
kubectl get pod <pod-name> -o yaml | grep -A 20 livenessProbe

# Manually execute probe command
kubectl exec <pod-name> -- powershell -Command "<probe-command>"

# View probe failures in logs
kubectl logs <pod-name> --previous

# Test HTTP probe manually
kubectl exec <pod-name> -- powershell -Command "Invoke-WebRequest http://localhost:80/health"
```

## Conclusion

Properly configured health probes ensure reliable Windows container operation in Kubernetes. Use HTTP probes for web applications, exec probes with PowerShell for custom logic, and TCP probes for simple port checks. Configure startup probes for slow-starting applications, set appropriate timing intervals, and implement comprehensive health check logic. Monitor probe failures and adjust thresholds based on application behavior. Well-designed probes improve application availability and enable Kubernetes to effectively manage container lifecycle.
