# How to Run IIS Web Applications in Windows Containers on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, IIS

Description: Step-by-step guide to deploying Internet Information Services (IIS) web applications in Windows containers on Kubernetes with configuration best practices.

---

Internet Information Services (IIS) is Microsoft's web server platform that powers millions of Windows-based websites and applications. Running IIS in Kubernetes containers allows you to modernize legacy Windows applications while maintaining compatibility with existing .NET Framework code and IIS-specific features. This guide covers deploying IIS applications in Kubernetes, from basic static sites to complex ASP.NET applications with proper configuration and scaling.

## Understanding IIS in Containers

IIS containers use Windows Server Core or Windows Server images with IIS preinstalled. Unlike Linux web servers that typically run as foreground processes, IIS runs as a Windows service. Container images include the necessary configuration to run IIS in container mode where the w3svc service starts automatically and keeps the container running.

The official IIS images from Microsoft Container Registry provide several base tags for different Windows versions. Choose the tag matching your Windows node version for compatibility.

## Creating a Basic IIS Container

Start with a simple static website deployment:

```yaml
# iis-static-site.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-static-website
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iis-web
  template:
    metadata:
      labels:
        app: iis-web
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
---
apiVersion: v1
kind: Service
metadata:
  name: iis-service
spec:
  selector:
    app: iis-web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

Deploy and test:

```bash
kubectl apply -f iis-static-site.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod -l app=iis-web --timeout=300s

# Get service external IP
kubectl get service iis-service

# Test the website
curl http://<external-ip>
```

## Building Custom IIS Images with Application Code

Create a Dockerfile to package your application:

```dockerfile
# Dockerfile for IIS application
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Set working directory
WORKDIR /inetpub/wwwroot

# Remove default IIS files
RUN powershell -Command Remove-Item -Path 'C:\inetpub\wwwroot\*' -Recurse -Force

# Copy application files
COPY ./app /inetpub/wwwroot

# Configure IIS application pool
RUN powershell -Command \
    Import-Module WebAdministration; \
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name processModel.identityType -Value LocalSystem; \
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name recycling.periodicRestart.time -Value '00:00:00'; \
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name processModel.idleTimeout -Value '00:00:00'

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Start IIS (not needed, base image handles this)
# The container will run IIS automatically
```

Build and push the image:

```bash
# Build the image
docker build -t myregistry.azurecr.io/myapp:v1 .

# Push to container registry
docker push myregistry.azurecr.io/myapp:v1
```

Deploy the custom image:

```yaml
# custom-iis-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-iis-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: custom-app
  template:
    metadata:
      labels:
        app: custom-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: myregistry.azurecr.io/myapp:v1
        ports:
        - containerPort: 80
        env:
        - name: APP_ENV
          value: "production"
        - name: CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connectionString
```

## Deploying ASP.NET Framework Applications

For ASP.NET applications, configure IIS and application pool settings:

```dockerfile
# ASP.NET application Dockerfile
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Install additional features if needed
RUN powershell -Command \
    Add-WindowsFeature Web-Asp-Net45; \
    Add-WindowsFeature Web-Windows-Auth

WORKDIR /inetpub/wwwroot

# Remove default content
RUN powershell -Command Remove-Item -Path 'C:\inetpub\wwwroot\*' -Recurse -Force

# Copy published application
COPY ./publish /inetpub/wwwroot

# Configure IIS for ASP.NET
RUN powershell -Command \
    Import-Module WebAdministration; \
    # Set application pool to .NET 4.0
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name managedRuntimeVersion -Value 'v4.0'; \
    # Enable 32-bit applications if needed
    # Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name enable32BitAppOnWin64 -Value $true; \
    # Set pipeline mode
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name managedPipelineMode -Value 'Integrated'; \
    # Configure recycling
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name recycling.periodicRestart.time -Value '00:00:00'; \
    # Set memory limits
    Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name recycling.periodicRestart.privateMemory -Value 1024000

EXPOSE 80
```

Create ConfigMap for web.config overrides:

```yaml
# iis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: iis-web-config
data:
  web.config: |
    <?xml version="1.0" encoding="utf-8"?>
    <configuration>
      <system.web>
        <compilation debug="false" targetFramework="4.8" />
        <httpRuntime targetFramework="4.8" maxRequestLength="10240" />
        <customErrors mode="RemoteOnly" />
      </system.web>
      <system.webServer>
        <security>
          <requestFiltering>
            <requestLimits maxAllowedContentLength="10485760" />
          </requestFiltering>
        </security>
        <httpProtocol>
          <customHeaders>
            <add name="X-Content-Type-Options" value="nosniff" />
            <add name="X-Frame-Options" value="SAMEORIGIN" />
          </customHeaders>
        </httpProtocol>
      </system.webServer>
      <appSettings>
        <add key="Environment" value="Production" />
      </appSettings>
    </configuration>
```

Mount the ConfigMap:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aspnet-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aspnet
  template:
    metadata:
      labels:
        app: aspnet
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: myregistry.azurecr.io/aspnet-app:v1
        volumeMounts:
        - name: config
          mountPath: C:\inetpub\wwwroot\web.config
          subPath: web.config
      volumes:
      - name: config
        configMap:
          name: iis-web-config
```

## Configuring Health Checks for IIS

Implement proper health checks for IIS applications:

```yaml
# iis-with-health-checks.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app-with-health
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iis-health
  template:
    metadata:
      labels:
        app: iis-health
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        ports:
        - containerPort: 80
        # Startup probe - gives IIS time to start
        startupProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 30
        # Liveness probe - detects if IIS has crashed
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        # Readiness probe - determines if app can receive traffic
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
```

Create a health check endpoint in your application:

```aspx
<!-- health.aspx -->
<%@ Page Language="C#" %>
<%
    try
    {
        // Check database connectivity
        // Check external dependencies
        // Return 200 if healthy
        Response.StatusCode = 200;
        Response.Write("OK");
    }
    catch (Exception ex)
    {
        Response.StatusCode = 503;
        Response.Write("Unhealthy: " + ex.Message);
    }
%>
```

## Using Persistent Storage with IIS

Mount persistent volumes for application data:

```yaml
# iis-with-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: iis-app-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: managed-premium
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: iis-stateful
spec:
  serviceName: iis-stateful-service
  replicas: 2
  selector:
    matchLabels:
      app: iis-stateful
  template:
    metadata:
      labels:
        app: iis-stateful
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        volumeMounts:
        - name: app-data
          mountPath: C:\inetpub\wwwroot\App_Data
        - name: logs
          mountPath: C:\inetpub\logs
        ports:
        - containerPort: 80
  volumeClaimTemplates:
  - metadata:
      name: app-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: managed-premium
      resources:
        requests:
          storage: 20Gi
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: managed-standard
      resources:
        requests:
          storage: 10Gi
```

## Configuring HTTPS with Certificates

Enable HTTPS in IIS containers:

```yaml
# iis-https.yaml
apiVersion: v1
kind: Secret
metadata:
  name: iis-tls-cert
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-https
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis-https
  template:
    metadata:
      labels:
        app: iis-https
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        command:
        - powershell.exe
        - -Command
        - |
          # Import certificate
          $certPath = "C:\certs\tls.crt"
          $keyPath = "C:\certs\tls.key"

          # Create PFX from cert and key
          $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
          $cert.Import($certPath)

          # Install certificate to LocalMachine store
          $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
          $store.Open("ReadWrite")
          $store.Add($cert)
          $store.Close()

          # Configure IIS HTTPS binding
          Import-Module WebAdministration
          New-WebBinding -Name "Default Web Site" -Protocol https -Port 443

          # Bind certificate
          $certThumbprint = $cert.Thumbprint
          $binding = Get-WebBinding -Name "Default Web Site" -Protocol https
          $binding.AddSslCertificate($certThumbprint, "My")

          Write-Host "HTTPS configured successfully"

          # Keep container running
          while ($true) { Start-Sleep -Seconds 3600 }
        volumeMounts:
        - name: certs
          mountPath: C:\certs
          readOnly: true
        ports:
        - containerPort: 80
        - containerPort: 443
      volumes:
      - name: certs
        secret:
          secretName: iis-tls-cert
```

## Scaling IIS Applications

Configure horizontal pod autoscaling:

```yaml
# iis-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: iis-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: custom-iis-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

## Monitoring IIS in Kubernetes

Collect IIS metrics and logs:

```yaml
# iis-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              C:\inetpub\logs\LogFiles\W3SVC1\*.log
        Parser            iis
        Tag               iis.access
        Refresh_Interval  5

    [PARSER]
        Name   iis
        Format regex
        Regex  ^(?<time>[^ ]+) (?<s_ip>[^ ]+) (?<cs_method>[^ ]+) (?<cs_uri_stem>[^ ]+) (?<cs_uri_query>[^ ]+) (?<s_port>[^ ]+) (?<cs_username>[^ ]+) (?<c_ip>[^ ]+) (?<cs_User_Agent>[^ ]+) (?<cs_Referer>[^ ]+) (?<sc_status>[^ ]+) (?<sc_substatus>[^ ]+) (?<sc_win32_status>[^ ]+) (?<time_taken>[^ ]+)$
        Time_Key time
        Time_Format %Y-%m-%d %H:%M:%S

    [OUTPUT]
        Name  stdout
        Match *
```

## Troubleshooting IIS Containers

Common troubleshooting commands:

```bash
# Check IIS service status in container
kubectl exec <pod-name> -- powershell -Command "Get-Service W3SVC"

# View IIS logs
kubectl exec <pod-name> -- powershell -Command "Get-Content C:\inetpub\logs\LogFiles\W3SVC1\*.log -Tail 50"

# Check application pool status
kubectl exec <pod-name> -- powershell -Command "Import-Module WebAdministration; Get-WebAppPoolState"

# Restart application pool
kubectl exec <pod-name> -- powershell -Command "Import-Module WebAdministration; Restart-WebAppPool DefaultAppPool"

# View IIS configuration
kubectl exec <pod-name> -- powershell -Command "Get-WebConfiguration"

# Test HTTP connectivity
kubectl exec <pod-name> -- powershell -Command "Invoke-WebRequest -Uri http://localhost -UseBasicParsing"
```

## Conclusion

Running IIS in Kubernetes containers enables you to modernize Windows web applications while maintaining compatibility with existing code and infrastructure. Proper configuration of health checks, resource limits, storage, and monitoring ensures reliable operation in production environments.

For legacy ASP.NET applications, containerization with Kubernetes provides improved scalability, deployment consistency, and infrastructure automation without requiring application rewrites. Start with simple static sites to learn the patterns, then progressively migrate more complex applications as you gain confidence with Windows containers in Kubernetes.
