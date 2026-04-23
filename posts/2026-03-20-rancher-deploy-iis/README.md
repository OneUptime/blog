# How to Deploy IIS on Windows Nodes in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, IIS, Web Server, ASP.NET

Description: Deploy Internet Information Services (IIS) on Windows nodes in Rancher Kubernetes clusters for hosting ASP.NET Framework and classic web applications.

## Introduction

Internet Information Services (IIS) is Microsoft's web server for hosting ASP.NET Framework applications, ASPX pages, and classic Windows-based web services. Containerized IIS allows these applications to run in Kubernetes while preserving a Windows-based IIS hosting environment. This guide covers deploying IIS-based applications on Windows nodes in Rancher.

## Prerequisites

- Rancher cluster with Linux control plane/ingress nodes and Windows worker nodes that match your container base image (the examples below use Windows Server 2022)
- Windows container images with IIS
- kubectl access
- TLS certificates for HTTPS
- Windows-compatible CSI storage if you want persistent logs or application data

## Step 1: Create IIS Docker Image

```dockerfile
# Dockerfile - IIS with ASP.NET Framework 4.8

FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Install additional IIS features
RUN powershell -Command \
    Add-WindowsFeature Web-Server; \
    Add-WindowsFeature Web-Asp-Net45; \
    Add-WindowsFeature Web-Net-Ext45; \
    Add-WindowsFeature Web-ISAPI-Ext; \
    Add-WindowsFeature Web-ISAPI-Filter; \
    Add-WindowsFeature Web-Includes; \
    Add-WindowsFeature Web-Http-Redirect; \
    Add-WindowsFeature Web-Custom-Logging; \
    Add-WindowsFeature Web-Log-Libraries; \
    Add-WindowsFeature Web-Request-Monitor; \
    Add-WindowsFeature Web-Http-Tracing; \
    Remove-Item -Recurse C:\inetpub\wwwroot\*

# Copy application files
WORKDIR C:/inetpub/wwwroot
COPY ./src .

# Configure application pool
RUN powershell -Command \
    Import-Module WebAdministration; \
    Set-ItemProperty -Path "IIS:\AppPools\DefaultAppPool" -Name processModel.identityType -Value 4; \
    Set-ItemProperty -Path "IIS:\AppPools\DefaultAppPool" -Name managedRuntimeVersion -Value 'v4.0'

EXPOSE 80

CMD ["C:\\ServiceMonitor.exe", "w3svc"]
```

```bash
# Build and push Windows IIS image
docker build -t registry.example.com/my-iis-app:v1.0 .
docker push registry.example.com/my-iis-app:v1.0
```

## Step 2: Deploy IIS Application

```yaml
# iis-deployment.yaml - Deploy IIS application on Windows nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: production
  labels:
    app: iis-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis-app
  template:
    metadata:
      labels:
        app: iis-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"

      # Include this toleration only if your Windows nodes are tainted with os=windows:NoSchedule
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule

      imagePullSecrets:
        - name: windows-registry-secret

      containers:
        - name: iis
          image: registry.example.com/my-iis-app:v1.0
          ports:
            - containerPort: 80
              protocol: TCP
          envFrom:
            - configMapRef:
                name: iis-config
          env:
            - name: CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: connection-string
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          # Windows containers need longer startup time
          readinessProbe:
            httpGet:
              path: /healthcheck.aspx
              port: 80
            initialDelaySeconds: 90
            periodSeconds: 10
            failureThreshold: 10
          livenessProbe:
            httpGet:
              path: /healthcheck.aspx
              port: 80
            initialDelaySeconds: 120
            periodSeconds: 30
            failureThreshold: 3
```

## Step 3: Create Service and Ingress

```yaml
# iis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: iis-app
  namespace: production
spec:
  selector:
    app: iis-app
  ports:
    - name: http
      port: 80
      targetPort: 80
  type: ClusterIP
---
# iis-ingress.yaml - Ingress for IIS application
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iis-app
  namespace: production
  annotations:
    # Increase timeouts for IIS applications
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: iis-app
                port:
                  number: 80
```

## Step 4: Configure Application Settings

```yaml
# iis-configmap.yaml - Application settings exposed as environment variables
apiVersion: v1
kind: ConfigMap
metadata:
  name: iis-config
  namespace: production
data:
  APP_ENV: "production"
```

## Step 5: Configure Persistent Storage for IIS Logs

```yaml
# iis-statefulset.yaml - IIS with log persistence
apiVersion: v1
kind: Service
metadata:
  name: iis-app-stateful
  namespace: production
spec:
  clusterIP: None
  selector:
    app: iis-app-stateful
  ports:
    - name: http
      port: 80
      targetPort: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: iis-app-stateful
  namespace: production
spec:
  serviceName: iis-app-stateful
  replicas: 1
  selector:
    matchLabels:
      app: iis-app-stateful
  template:
    metadata:
      labels:
        app: iis-app-stateful
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"
      # Include this toleration only if your Windows nodes are tainted with os=windows:NoSchedule
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule
      containers:
        - name: iis
          image: registry.example.com/my-iis-app:v1.0
          ports:
            - containerPort: 80
          volumeMounts:
            - name: logs
              mountPath: C:\inetpub\logs
            - name: app-data
              mountPath: C:\app\data
  volumeClaimTemplates:
    # Requires a Windows-compatible default CSI StorageClass in the cluster
    - metadata:
        name: logs
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
    - metadata:
        name: app-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

## Step 6: Health Check ASP.NET Page

```csharp
// healthcheck.aspx.cs - Simple health check for IIS
using System;
using System.Web;
using System.Data.SqlClient;

public partial class healthcheck : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.ContentType = "application/json";

        try
        {
            // Check database connectivity
            string connStr = Environment.GetEnvironmentVariable("CONNECTION_STRING");
            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
            }
            Response.StatusCode = 200;
            Response.Write("{\"status\":\"healthy\"}");
        }
        catch (Exception ex)
        {
            Response.StatusCode = 503;
            Response.Write("{\"status\":\"unhealthy\",\"error\":\"" + HttpUtility.JavaScriptStringEncode(ex.Message) + "\"}");
        }
    }
}
```

## Conclusion

Deploying IIS on Windows nodes in Rancher brings legacy ASP.NET applications into the Kubernetes ecosystem without rewriting them. The ServiceMonitor.exe binary in the Windows Server Core IIS image is essential-it properly manages the IIS worker process lifecycle inside containers. Key configuration points are using longer readiness probe initial delays (90-120 seconds) for IIS startup time, configuring appropriate resource limits for the application pool, and using persistent volumes for IIS logs to support debugging. This approach enables gradual modernization by running IIS applications alongside newer microservices.
