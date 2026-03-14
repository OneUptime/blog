# How to Deploy .NET Framework Applications with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, .NET Framework, GitOps, Legacy Applications, WCF

Description: Deploy legacy .NET Framework applications in Windows containers to Kubernetes using Flux CD, with configuration management and health monitoring.

---

## Introduction

The .NET Framework — versions 4.x and below — is a Windows-only runtime that powers millions of enterprise applications: WCF services, Web Forms applications, WPF backends, and legacy class libraries that cannot easily migrate to .NET 6+. Running these applications in Windows containers on Kubernetes provides the operational benefits of containerization — consistent environments, scalable deployments, rolling updates — without requiring application rewrites.

Flux CD treats .NET Framework applications identically to any other containerized workload. The GitOps workflow remains the same: manifests in Git, Flux reconciles them onto Windows nodes. The differences are in the container images (Windows Server Core base required) and the operational characteristics (slower startup, larger image sizes, Windows-specific health check URLs).

This guide covers deploying a .NET Framework WCF service and a Web Forms application with Flux CD, including connection string management, application-specific health checks, and rolling update configuration.

## Prerequisites

- Kubernetes cluster with Windows Server 2022 or 2019 nodes
- .NET Framework application containerized with Windows Server Core base image
- Flux CD managing the cluster
- SQL Server or other backend accessible from Windows pods
- `kubectl` and `flux` CLI tools

## Step 1: Container Image Requirements

.NET Framework requires Windows Server Core (not Nano Server) because of its dependency on the full Windows API surface.

```dockerfile
# Multi-stage build for .NET Framework WCF service
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR /src

# Restore and build
COPY *.sln .
COPY MyService/*.csproj ./MyService/
RUN nuget restore

COPY . .
RUN msbuild MyService/MyService.csproj /p:Configuration=Release /p:OutputPath=/app/publish

# Runtime image - smaller than SDK
FROM mcr.microsoft.com/dotnet/framework/wcf:4.8-windowsservercore-ltsc2022 AS runtime
WORKDIR /inetpub/wwwroot

COPY --from=build /app/publish .

EXPOSE 80
```

## Step 2: WCF Service Deployment

```yaml
# apps/base/windows-workloads/wcf-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wcf-service
  namespace: windows-workloads
  labels:
    app: wcf-service
    os: windows
    runtime: dotnet-framework-4.8
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wcf-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: wcf-service
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      # WCF services can take 3+ minutes to initialize
      terminationGracePeriodSeconds: 180

      containers:
        - name: wcf-service
          image: my-registry.example.com/windows/wcf-service:v3.2.1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
              name: http

          env:
            - name: SQL_SERVER
              value: "sql-server.database.svc.cluster.local"
            - name: SQL_DATABASE
              value: "ProductionDB"
            - name: SQL_USER
              valueFrom:
                secretKeyRef:
                  name: wcf-service-db-credentials
                  key: username
            - name: SQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: wcf-service-db-credentials
                  key: password

          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi

          # WCF health probe - check the service WSDL endpoint
          readinessProbe:
            httpGet:
              path: /MyService.svc?wsdl
              port: 80
            initialDelaySeconds: 120   # .NET Framework WCF can be slow to start
            periodSeconds: 20
            timeoutSeconds: 15
            failureThreshold: 6

          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 180
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3

      imagePullSecrets:
        - name: registry-credentials
```

## Step 3: Web Forms Application Deployment

```yaml
# apps/base/windows-workloads/webforms-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webforms-app
  namespace: windows-workloads
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webforms-app
  template:
    metadata:
      labels:
        app: webforms-app
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      containers:
        - name: webforms-app
          image: my-registry.example.com/windows/webforms-app:v5.1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80

          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            # Session state - use Redis for shared sessions across replicas
            - name: REDIS_CONNECTION
              valueFrom:
                secretKeyRef:
                  name: webforms-redis-secret
                  key: connection-string

          readinessProbe:
            httpGet:
              path: /default.aspx
              port: 80
            initialDelaySeconds: 90
            periodSeconds: 15
            failureThreshold: 5

          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 2Gi
```

## Step 4: Manage Connection Strings with Sealed Secrets

```bash
# Create database credentials as Sealed Secret
kubectl create secret generic wcf-service-db-credentials \
  --from-literal=username="sa" \
  --from-literal=password="$DB_PASSWORD" \
  --dry-run=client -o yaml | \
  kubeseal --namespace windows-workloads --format yaml > \
  apps/base/windows-workloads/wcf-service/db-credentials-sealed.yaml

git add apps/base/windows-workloads/wcf-service/db-credentials-sealed.yaml
git commit -m "security: add sealed DB credentials for WCF service"
git push
```

## Step 5: Flux Kustomization with Extended Timeouts

```yaml
# clusters/production/wcf-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: wcf-service
  namespace: flux-system
spec:
  interval: 5m
  timeout: 25m       # .NET Framework apps need longer timeout for health checks
  path: ./apps/base/windows-workloads/wcf-service
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: wcf-service
      namespace: windows-workloads
  dependsOn:
    - name: sql-server  # Ensure SQL Server is available first
```

## Step 6: Handle .NET Framework-Specific Issues

```bash
# Debug a failing .NET Framework container
# Get Windows event logs from inside the container
kubectl exec -it wcf-service-xxx -n windows-workloads -- \
  powershell -Command "Get-EventLog -LogName Application -Newest 20 | Format-List"

# Check IIS application pool status
kubectl exec -it wcf-service-xxx -n windows-workloads -- \
  powershell -Command "Import-Module WebAdministration; Get-WebConfiguration '/system.applicationHost/applicationPools/add' | Select-Object name, state"

# View .NET application errors
kubectl logs wcf-service-xxx -n windows-workloads --tail=50
```

## Best Practices

- Use the WCF-specific base image (`mcr.microsoft.com/dotnet/framework/wcf`) rather than the generic servercore image — it includes all required WCF components.
- Set `initialDelaySeconds` to 120+ for .NET Framework applications — JIT compilation on first request significantly increases startup time.
- Configure session state to use Redis or SQL Server for Web Forms apps with multiple replicas — in-memory session breaks with more than 1 replica.
- Use Sealed Secrets for database connection strings — never put credentials in ConfigMaps or deployment environment variables.
- Enable .NET Framework crash dump collection by mounting a host path volume and configuring WER (Windows Error Reporting).
- Implement a dedicated health endpoint (`/health`) in your application rather than relying on the main page for health checks.

## Conclusion

.NET Framework applications are first-class citizens in a Flux CD-managed Kubernetes cluster. While they require Windows nodes and Windows-specific container images, the GitOps workflow is identical to any other workload. The main operational considerations — longer startup times, Windows-specific session state, and framework-specific health endpoints — are all addressable through Kubernetes configuration, and that configuration lives in Git where Flux can manage it.
