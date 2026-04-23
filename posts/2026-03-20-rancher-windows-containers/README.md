# How to Deploy Windows Containers in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Container, Kubernetes, .NET

Description: Deploy Windows containers in Rancher Kubernetes clusters using proper node selectors, compatible base images, and Windows-specific configuration.

## Introduction

Windows containers allow you to run Windows-native applications-including legacy .NET Framework apps, IIS, and Windows services-in Kubernetes. This guide covers deploying Windows containers in Rancher with correct image selection, scheduling configuration, and compatibility considerations.

## Prerequisites

- Rancher cluster with Linux nodes, at least one Linux worker node, and Windows worker nodes
- Windows container images in your registry
- kubectl configured for the cluster
- Understanding of Windows container base images

## Step 1: Choose the Right Windows Base Image

```dockerfile
# Windows container compatibility in Kubernetes:
#
# - Kubernetes supports Windows containers with process isolation only
# - Match the Windows container image tag to the Windows Server version on the node
# - If your cluster has multiple Windows versions, add a node selector for node.kubernetes.io/windows-build

# For .NET Framework 4.x applications
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

# For .NET 8 applications
FROM mcr.microsoft.com/dotnet/runtime:8.0-nanoserver-ltsc2022

# For ASP.NET Core on Windows
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022

# For IIS-based applications
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2022 AS build
WORKDIR /app
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Step 2: Deploy a Windows Container

```yaml
# windows-deployment.yaml - Deploy Windows container
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
      # REQUIRED: Schedule on Windows nodes
      nodeSelector:
        kubernetes.io/os: windows

      containers:
        - name: dotnet-app
          image: registry.example.com/dotnet-app:v1.0
          ports:
            - containerPort: 8080
              protocol: TCP
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            - name: ASPNETCORE_URLS
              value: http://+:8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          # Windows apps often need a longer startup window before readiness checks succeed
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 60  # Windows containers take longer to start
            periodSeconds: 10
            failureThreshold: 5
```

## Step 3: Service and Ingress for Windows Apps

```yaml
# windows-service.yaml - Expose Windows app
apiVersion: v1
kind: Service
metadata:
  name: dotnet-app
  namespace: production
spec:
  selector:
    app: dotnet-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
  type: ClusterIP
---
# windows-ingress.yaml - Ingress for Windows app
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dotnet-app
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dotnet-app
                port:
                  number: 80
```

## Step 4: ConfigMap and Secrets for Windows Apps

```yaml
# windows-config.yaml - Configuration for Windows containers
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Use Windows-style paths in app configuration values
  log-path: "C:\\app\\logs"
  config-path: "C:\\app\\config"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  connection-string: "Server=sql.example.com;Database=AppDB;User=app;Password=secret"
  api-key: "my-api-key-value"
```

## Step 5: Windows Job for Batch Processing

```yaml
# windows-job.yaml - Windows container as a Kubernetes Job
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
  namespace: production
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      restartPolicy: Never
      containers:
        - name: migration
          image: registry.example.com/migration-tool:v1.0
          command:
            - "powershell.exe"
            - "-Command"
            - "& C:\\migration\\Migrate.ps1"
          env:
            - name: DB_CONNECTION
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: connection-string
          resources:
            requests:
              cpu: 1000m
              memory: 1Gi
```

## Step 6: StatefulSet with Windows Persistent Storage

```yaml
# windows-statefulset.yaml - Windows app with persistent storage
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  namespace: production
spec:
  clusterIP: None
  selector:
    app: legacy-app
  ports:
    - name: http
      port: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: legacy-app
  namespace: production
spec:
  serviceName: legacy-app
  replicas: 1
  selector:
    matchLabels:
      app: legacy-app
  template:
    metadata:
      labels:
        app: legacy-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: app
          image: registry.example.com/legacy-app:v1.0
          volumeMounts:
            - name: data
              mountPath: C:\app\data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        # Replace with a StorageClass backed by a CSI driver that supports Windows nodes
        storageClassName: windows-csi
        resources:
          requests:
            storage: 10Gi
```

## Step 7: Debugging Windows Containers

```bash
# Exec into a running Windows container
kubectl exec -it deploy/dotnet-app -n production -- powershell.exe

# View Windows container logs
kubectl logs deploy/dotnet-app -n production --tail=100

# Describe pod for Windows-specific events
kubectl describe pods -l app=dotnet-app -n production
```

## Conclusion

Deploying Windows containers in Rancher enables hybrid workloads where legacy Windows applications run alongside modern Linux microservices in the same cluster. The key requirements are matching the Windows Server version on the node with the container image tag, always specifying `nodeSelector: kubernetes.io/os: windows`, and accounting for longer Windows application startup times in readiness probe configuration. The Windows Server Core base image provides maximum compatibility with legacy applications, while Nano Server offers a smaller footprint for modern .NET applications.
