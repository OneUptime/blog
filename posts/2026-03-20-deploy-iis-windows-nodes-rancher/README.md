# How to Deploy IIS on Windows Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, IIS, Window, Web Server, Kubernetes, Legacy Applications

Description: Deploy Microsoft IIS web server on Windows nodes in Rancher with static websites, ASP.NET applications, and proper service configuration.

## Introduction

IIS (Internet Information Services) is the Microsoft web server platform for hosting .NET Framework applications, classic ASP applications, and static websites. Containerizing IIS applications lets you run them on Rancher without rewriting them for Linux.

## Step 1: Create an IIS Dockerfile

```dockerfile
# Dockerfile for IIS-hosted .NET Framework app

FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Install ASP.NET 4.8 features (if needed)
RUN powershell -NoProfile -Command \
    Add-WindowsFeature Web-Asp-Net45; \
    Remove-Item -Recurse C:\Windows\Temp\*

# Remove default IIS website
RUN powershell -NoProfile -Command \
    Remove-WebSite -Name "Default Web Site"

# Copy application files
WORKDIR /inetpub/wwwroot/myapp
COPY ./publish .

# Create IIS website
RUN powershell -NoProfile -Command \
    New-WebSite -Name "MyApp" \
                -Port 80 \
                -PhysicalPath "C:\inetpub\wwwroot\myapp" \
                -Force

EXPOSE 80
```

## Step 2: Configure Application Pool

```dockerfile
# Add to Dockerfile for custom app pool settings
RUN powershell -NoProfile -Command \
    New-WebAppPool -Name "MyApp"; \
    Set-WebConfiguration system.applicationHost/applicationPools/add[@name="MyApp"]/processModel \
        -Value @{userName=""; password=""; identityType="ApplicationPoolIdentity"}; \
    Set-ItemProperty "IIS:\AppPools\MyApp" "managedRuntimeVersion" "v4.0"; \
    Set-ItemProperty "IIS:\Sites\MyApp" -Name applicationPool -Value "MyApp"
```

## Step 3: Deploy to Rancher

```yaml
# iis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: production
spec:
  replicas: 3
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
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule
      containers:
        - name: iis
          image: myregistry/iis-app:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
          livenessProbe:
            httpGet:
              path: /health.aspx
              port: 80
            initialDelaySeconds: 60   # IIS takes time to start
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready.aspx
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
```

## Step 4: Expose via Ingress

```yaml
# iis-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iis-app
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
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

## Step 5: Configuration and Secrets

```yaml
# Pass connection strings to IIS via environment variables
env:
  - name: ASPNETCORE_ENVIRONMENT
    value: "Production"
  - name: ConnectionStrings__DefaultConnection
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: connection-string

# IIS can read environment variables from the container environment
# In Web.config transforms:
# <add name="DefaultConnection" connectionString="%ConnectionStrings__DefaultConnection%" />
```

## Conclusion

Deploying IIS on Rancher Windows nodes is a viable path for running legacy .NET Framework applications in Kubernetes without a full Linux rewrite. The containerized IIS approach preserves all existing application code while gaining Kubernetes benefits like scaling, health checking, and rolling deployments.
