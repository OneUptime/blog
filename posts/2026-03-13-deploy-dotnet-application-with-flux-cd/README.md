# How to Deploy a .NET Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, .NET, C#, ASP.NET Core, Deployment

Description: Deploy a .NET Core ASP.NET application to Kubernetes using Flux CD GitOps, with health checks, graceful shutdown, and environment-based configuration.

---

## Introduction

.NET (formerly .NET Core) has become a top-tier choice for building high-performance microservices and web APIs. ASP.NET Core is fast, cross-platform, and ships with built-in health check endpoints, graceful shutdown support, and structured logging — features that map directly to Kubernetes operational requirements. The .NET SDK's built-in Docker support (`dotnet publish /p:PublishProfile=DefaultContainer`) makes containerization straightforward.

Running .NET on Kubernetes with Flux CD gives you a GitOps-driven deployment pipeline where configuration differences between environments are managed through Kubernetes ConfigMaps and Secrets, not separate Docker images. Flux ensures every cluster always reflects the state declared in your Git repository.

This guide covers the multi-stage .NET Dockerfile, ASP.NET Core health check integration, environment configuration, and the complete Flux pipeline.

## Prerequisites

- A .NET 8 or .NET 9 ASP.NET Core application
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize the .NET Application

```dockerfile
# Dockerfile — multi-stage build: SDK for compile, runtime for execution
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /src
# Restore dependencies first (cached separately from source)
COPY *.csproj ./
RUN dotnet restore --runtime linux-musl-x64

COPY . .
# Publish a self-contained, single-file executable
RUN dotnet publish \
    --configuration Release \
    --runtime linux-musl-x64 \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:PublishTrimmed=true \
    --output /app/publish

# Use a minimal runtime image
FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine AS runner
WORKDIR /app
# Create non-root user
RUN addgroup -S dotnet && adduser -S dotnet -G dotnet
COPY --from=builder --chown=dotnet:dotnet /app/publish .
USER dotnet
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["./MyApp"]
```

```bash
docker build -t ghcr.io/your-org/my-dotnet-app:1.0.0 .
docker push ghcr.io/your-org/my-dotnet-app:1.0.0
```

## Step 2: Add Health Checks to the ASP.NET Core Application

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add health checks
builder.Services.AddHealthChecks()
    // Add custom checks: database, external services, etc.
    .AddCheck("self", () => HealthCheckResult.Healthy("Application is running"));

// Add controllers
builder.Services.AddControllers();

var app = builder.Build();

// Map health check endpoints
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false   // Liveness: only check self, not dependencies
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = _ => true    // Readiness: check all registered health checks
});

app.MapControllers();
app.Run();
```

## Step 3: Configure for Kubernetes via appsettings

```json
// appsettings.Production.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  // Use structured JSON logging for Kubernetes log aggregation
  "Serilog": {
    "Using": ["Serilog.Sinks.Console"],
    "WriteTo": [
      { "Name": "Console", "Args": { "formatter": "Serilog.Formatting.Compact.CompactJsonFormatter, Serilog.Formatting.Compact" } }
    ]
  }
}
```

## Step 4: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-dotnet-app
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dotnet-config
  namespace: my-dotnet-app
data:
  ASPNETCORE_ENVIRONMENT: "Production"
  ASPNETCORE_URLS: "http://+:8080"
  Logging__LogLevel__Default: "Information"
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-dotnet-app
  namespace: my-dotnet-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-dotnet-app
  template:
    metadata:
      labels:
        app: my-dotnet-app
    spec:
      containers:
        - name: my-dotnet-app
          image: ghcr.io/your-org/my-dotnet-app:1.0.0  # {"$imagepolicy": "flux-system:my-dotnet-app"}
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: dotnet-config
          env:
            - name: ConnectionStrings__DefaultConnection
              valueFrom:
                secretKeyRef:
                  name: dotnet-secrets
                  key: CONNECTION_STRING
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "1000m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 30
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-dotnet-app
  namespace: my-dotnet-app
spec:
  selector:
    app: my-dotnet-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-dotnet-app
  namespace: my-dotnet-app
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-dotnet-app
                port:
                  number: 80
```

## Step 5: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-dotnet-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-dotnet-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-dotnet-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-dotnet-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-dotnet-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-dotnet-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-dotnet-app
      namespace: my-dotnet-app
```

## Step 6: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-dotnet-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-dotnet-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-dotnet-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-dotnet-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-dotnet-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-dotnet-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-dotnet-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update dotnet app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 7: Verify the Deployment

```bash
flux get kustomizations my-dotnet-app
kubectl get pods -n my-dotnet-app

kubectl port-forward -n my-dotnet-app svc/my-dotnet-app 8080:80
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
```

## Best Practices

- Use `IHostApplicationLifetime.ApplicationStopping` to hook graceful shutdown logic in your .NET services so in-flight requests complete before the pod terminates.
- Use ASP.NET Core's built-in environment variable configuration binding: `ConnectionStrings__DefaultConnection` maps to `ConnectionStrings:DefaultConnection` in `appsettings.json`.
- Enable `PublishTrimmed=true` and `PublishSingleFile=true` to produce smaller, self-contained binaries that start faster.
- Add Prometheus metrics with the `prometheus-net.AspNetCore` package for out-of-the-box request rate, duration, and error metrics.
- Use Entity Framework Core migrations as a startup task with `db.Database.MigrateAsync()` or a separate migration Job (as with Django and Rails) depending on your team's preference.

## Conclusion

ASP.NET Core's built-in health checks, graceful shutdown, and structured logging make it a first-class citizen on Kubernetes. Combined with Flux CD's GitOps workflow, your .NET services benefit from auditable, automated deployments that always reflect the desired state in your Git repository.
