# How to Deploy IIS Windows Containers with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, IIS, GitOps, ASP.NET, Windows Server

Description: Deploy IIS web server Windows containers to Kubernetes using Flux CD, with custom configuration, TLS, and health monitoring.

---

## Introduction

Internet Information Services (IIS) remains one of the most widely deployed web server platforms in enterprise environments. Thousands of ASP.NET Web Forms applications, classic ASP sites, and WCF services run on IIS and cannot easily be migrated to Linux without significant rework. Containerizing these applications and running them in Kubernetes provides the operational consistency of modern container orchestration while preserving the IIS runtime.

Flux CD manages IIS container deployments with the same GitOps workflow as any other workload. Configuration changes — application pool settings, HTTPS bindings, custom error pages — are committed to Git and reconciled onto Windows nodes automatically. This guide covers deploying an IIS container with custom configuration, setting up TLS, and configuring health probes appropriate for IIS startup times.

## Prerequisites

- Kubernetes cluster with Windows Server 2022 nodes
- Flux CD bootstrapped on the cluster
- Custom IIS application container image (built with Windows base image)
- TLS certificate managed by cert-manager or stored as a Kubernetes secret
- `kubectl` and `flux` CLI tools

## Step 1: Build a Custom IIS Container Image

The deployment manifest references a pre-built image. Here is a typical Dockerfile for reference.

```dockerfile
# Dockerfile for IIS application
# Build on Windows Server 2022 host or using Windows Buildkit
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Enable IIS features required by your app
RUN powershell -NoProfile -Command \
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET45 -All; \
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WindowsAuthentication -All

# Remove default IIS website
RUN powershell -NoProfile -Command \
    Remove-WebSite -Name 'Default Web Site'

# Copy application files
COPY ./publish /inetpub/wwwroot/myapp

# Create website
RUN powershell -NoProfile -Command \
    New-WebSite -Name 'MyApp' -Port 80 -PhysicalPath 'C:\inetpub\wwwroot\myapp'

EXPOSE 80
```

## Step 2: Create the IIS Deployment Manifest

```yaml
# apps/base/windows-workloads/iis-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: windows-workloads
  labels:
    app: iis-app
    os: windows
    tier: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime for IIS apps
  template:
    metadata:
      labels:
        app: iis-app
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"  # Server 2022

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      # IIS apps can take 2-4 minutes to start depending on application size
      terminationGracePeriodSeconds: 120

      containers:
        - name: iis-app
          image: my-registry.example.com/windows/iis-app:v2.1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
              protocol: TCP
            - containerPort: 443
              protocol: TCP

          env:
            - name: ASPNET_ENV
              value: Production
            - name: CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: iis-app-secrets
                  key: connection-string

          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi

          # IIS probe - check the health endpoint
          readinessProbe:
            httpGet:
              path: /health
              port: 80
              httpHeaders:
                - name: Host
                  value: my-app.example.com
            initialDelaySeconds: 90    # IIS needs time to initialize
            periodSeconds: 15
            timeoutSeconds: 10
            failureThreshold: 5

          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 120
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3

      imagePullSecrets:
        - name: registry-credentials
```

## Step 3: Configure IIS via Kubernetes ConfigMap

Manage IIS configuration files through Git.

```yaml
# apps/base/windows-workloads/iis-app/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: iis-app-config
  namespace: windows-workloads
data:
  web.config: |
    <?xml version="1.0" encoding="utf-8"?>
    <configuration>
      <system.web>
        <compilation debug="false" targetFramework="4.8" />
        <httpRuntime targetFramework="4.8" maxRequestLength="51200" />
        <customErrors mode="RemoteOnly" defaultRedirect="/error" />
      </system.web>
      <system.webServer>
        <staticContent>
          <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
        </staticContent>
        <security>
          <requestFiltering>
            <requestLimits maxAllowedContentLength="52428800" />
          </requestFiltering>
        </security>
      </system.webServer>
      <appSettings>
        <add key="Environment" value="Production" />
      </appSettings>
    </configuration>
```

Mount the ConfigMap into the container:

```yaml
# Add to deployment spec
containers:
  - name: iis-app
    volumeMounts:
      - name: iis-config
        mountPath: C:\inetpub\wwwroot\myapp\web.config
        subPath: web.config
volumes:
  - name: iis-config
    configMap:
      name: iis-app-config
```

## Step 4: Configure the Flux Kustomization

```yaml
# clusters/production/windows-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: iis-app
  namespace: flux-system
spec:
  interval: 5m
  timeout: 20m     # IIS rollouts take longer than Linux apps
  path: ./apps/base/windows-workloads/iis-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: iis-app
      namespace: windows-workloads
  dependsOn:
    - name: windows-infrastructure  # Ensure Windows namespace exists first
```

## Step 5: Configure TLS for IIS

```yaml
# Use cert-manager Certificate for TLS (Linux component)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: iis-app-tls
  namespace: windows-workloads
spec:
  secretName: iis-app-tls-secret
  dnsNames:
    - my-app.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

Configure the Ingress to terminate TLS at an NGINX ingress (Linux) and forward to IIS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iis-app-ingress
  namespace: windows-workloads
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"  # Allow for slow IIS startup
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-app.example.com
      secretName: iis-app-tls-secret
  rules:
    - host: my-app.example.com
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

## Best Practices

- Use Windows Server 2022 (`ltsc2022`) base images for best performance and security support.
- Set `initialDelaySeconds` to at least 90 seconds for IIS readiness probes — application pool warm-up takes time.
- Use `RollingUpdate` with `maxUnavailable: 0` for zero-downtime IIS deployments.
- Manage `web.config` through Git-tracked ConfigMaps rather than baking it into the container image.
- Keep IIS application images small by minimizing installed features and using multi-stage builds.
- Monitor IIS application pool crashes via Windows event log forwarding to your log aggregation system.

## Conclusion

IIS Windows containers in Kubernetes, managed by Flux CD, bring the reliability and auditability of GitOps to the enterprise Windows application portfolio. The key configuration adjustments — longer health probe delays, OS-specific node targeting, and Windows-aware rolling update settings — make IIS deployments behave reliably in the Kubernetes lifecycle. Configuration changes to `web.config` and other IIS settings flow through Git, providing version control and rollback for web server configuration alongside application code.
