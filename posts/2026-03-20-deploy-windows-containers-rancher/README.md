# How to Deploy Windows Containers in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Windows Containers, Docker, IIS, .NET, Kubernetes

Description: Deploy Windows container workloads in Rancher including IIS web servers, .NET Framework apps, and Windows-specific configurations using proper node selectors.

## Introduction

Windows containers enable running legacy Windows applications (.NET Framework, IIS, COM components) in Kubernetes without rewriting them for Linux. Rancher supports Windows containers through Windows worker nodes in mixed Linux/Windows clusters. This guide covers deploying common Windows workloads.

## Key Differences from Linux Containers

- Base images must match the Windows Server version on the node
- CPU requests help with scheduling, but Windows can't guarantee a minimum amount of CPU time
- Use a Windows-supported CNI in Rancher (current RKE2 clusters support Calico or Flannel)
- Privileged containers are not supported on Windows

## Step 1: Choose the Correct Base Image

```dockerfile
# Windows Server 2022 container

FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Windows Server 2019 container
FROM mcr.microsoft.com/windows/servercore:ltsc2019

# Nano Server (lightweight, minimal footprint)
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# IIS web server
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
```

## Step 2: Build a Windows Container Image

```dockerfile
# Dockerfile for a .NET Framework 4.8 application
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

WORKDIR /inetpub/wwwroot

# Copy published application files
COPY ./publish .

# The base image already has IIS configured
EXPOSE 80
```

```bash
# Build on a Windows machine or Windows build agent
docker build -t myregistry/myapp-windows:latest .
docker push myregistry/myapp-windows:latest
```

## Step 3: Deploy the Windows Container

```yaml
# windows-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dotnet-app
  template:
    metadata:
      labels:
        app: dotnet-app
    spec:
      os:
        name: windows
      # Required: Schedule on Windows nodes only
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule
      containers:
        - name: app
          image: myregistry/myapp-windows:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1"
          env:
            - name: APP_ENVIRONMENT
              value: "Production"
            - name: DB_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: db-connection
```

## Step 4: Configure a Service

```yaml
# windows-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dotnet-app
  namespace: production
spec:
  selector:
    app: dotnet-app
  ports:
    - port: 80
      targetPort: 80
```

## Step 5: Health Checks for Windows

```yaml
# Example HTTP probes for a Windows container
livenessProbe:
  httpGet:
    path: /health
    port: 80
  initialDelaySeconds: 60    # Windows containers take longer to start
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10
```

## Conclusion

Windows containers in Rancher enable running legacy Windows applications in Kubernetes with minimal code changes. The critical requirement is matching your container image's Windows build to your worker node's OS build; mismatched versions result in container startup failures with cryptic error messages.
