# How to Deploy .NET Applications on Windows Nodes in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, .NET, C#, Container, Kubernetes

Description: Deploy both .NET Framework and .NET 8 applications on Windows nodes in Rancher Kubernetes clusters with appropriate base images, configuration, and scaling.

## Introduction

Windows nodes in Rancher can run .NET applications across the entire .NET ecosystem: legacy .NET Framework applications requiring Windows-specific APIs and full .NET Framework support, and modern .NET 8 applications optimized for containers. This guide covers deploying both types effectively with appropriate base image selection, configuration management, and operational practices.

## Prerequisites

- Rancher cluster with Windows worker nodes that match the Windows container base image build (for example, LTSC 2022 images on Windows Server 2022 nodes)
- .NET SDK on build machine
- Container registry accessible from Windows nodes
- kubectl access

## Step 1: Choose the Right .NET Base Image

```dockerfile
# .NET Framework 4.8 - For legacy applications

FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022
# OR
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET 8 on Windows Nano Server (smallest, modern)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022
# OR
FROM mcr.microsoft.com/dotnet/runtime:8.0-nanoserver-ltsc2022

# .NET 8 on Windows Server Core (more compatibility)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-windowsservercore-ltsc2022

# .NET 8 Worker Service (background service)
FROM mcr.microsoft.com/dotnet/runtime:8.0-nanoserver-ltsc2022
```

## Step 2: Dockerfile for .NET 8 ASP.NET Core

```dockerfile
# Multi-stage build for .NET 8 ASP.NET Core
FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2022 AS build
WORKDIR /src

# Restore packages
COPY ["MyApp/MyApp.csproj", "MyApp/"]
RUN dotnet restore "MyApp/MyApp.csproj"

# Build
COPY . .
WORKDIR "/src/MyApp"
RUN dotnet build "MyApp.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish --no-restore

# Runtime image (Nano Server - smallest)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022 AS final
WORKDIR /app

# Copy published app
COPY --from=publish /app/publish .

# Set environment
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Step 3: Deploy .NET 8 Application

```yaml
# dotnet8-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dotnet-api
  template:
    metadata:
      labels:
        app: dotnet-api
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"
      containers:
        - name: api
          image: registry.example.com/dotnet-api:v1.0
          ports:
            - containerPort: 8080
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            - name: ConnectionStrings__DefaultConnection
              valueFrom:
                secretKeyRef:
                  name: dotnet-secrets
                  key: connection-string
            - name: ApplicationInsights__ConnectionString
              valueFrom:
                secretKeyRef:
                  name: dotnet-secrets
                  key: appinsights-key
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 2000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 45
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
```

## Step 4: ASP.NET Core Health Checks Configuration

```csharp
// Program.cs - Configure health checks for Kubernetes
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "ready" });

var app = builder.Build();

// Map health endpoints
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false  // Always healthy (just checks process is alive)
});

app.MapHealthChecks("/health");

app.Run();
```

## Step 5: Deploy .NET Framework Application

```yaml
# dotnet-framework-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-dotnet-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy-dotnet-app
  template:
    metadata:
      labels:
        app: legacy-dotnet-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"
      # The official .NET Framework container images use Windows Server Core (larger image)
      containers:
        - name: app
          image: registry.example.com/legacy-app:v2.0
          ports:
            - containerPort: 80
          env:
            - name: APP_ENVIRONMENT
              value: Production
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          # .NET Framework apps start significantly slower
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 120
            periodSeconds: 15
            failureThreshold: 10
```

## Step 6: .NET Background Worker Service

```dockerfile
# Dockerfile for .NET Worker Service
FROM mcr.microsoft.com/dotnet/runtime:8.0-nanoserver-ltsc2022 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2022 AS build
WORKDIR /src
COPY ["WorkerService/WorkerService.csproj", "WorkerService/"]
RUN dotnet restore "WorkerService/WorkerService.csproj"
COPY . .
RUN dotnet publish "WorkerService/WorkerService.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkerService.dll"]
```

```yaml
# worker-deployment.yaml - .NET Worker Service as Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-worker
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dotnet-worker
  template:
    metadata:
      labels:
        app: dotnet-worker
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"
      containers:
        - name: worker
          image: registry.example.com/dotnet-worker:v1.0
          env:
            - name: RabbitMQ__Host
              value: rabbitmq.messaging.svc.cluster.local
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
```

## Step 7: Configure Horizontal Pod Autoscaler

```yaml
# dotnet-hpa.yaml - Autoscale .NET application
# Requires metrics-server or another metrics provider exposing metrics.k8s.io
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dotnet-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dotnet-api
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
          averageUtilization: 75
```

## Conclusion

Deploying .NET applications on Windows nodes in Rancher enables both cloud-native .NET 8 workloads and legacy .NET Framework applications to coexist in the same Kubernetes cluster. Modern .NET 8 applications on Nano Server benefit from small image sizes and fast startup times, while .NET Framework applications on Windows Server Core provide the wider Windows API surface and full .NET Framework support needed for many legacy codebases. The node selector pattern ensures workloads schedule on the correct OS, and health check configuration with appropriate delays accommodates Windows container startup characteristics.
