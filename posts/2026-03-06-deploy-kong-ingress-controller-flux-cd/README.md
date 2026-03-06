# How to Deploy Kong Ingress Controller with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kong, ingress controller, kubernetes, gitops, networking

Description: A practical guide to deploying and managing Kong Ingress Controller in Kubernetes using Flux CD for GitOps-driven ingress management.

---

## Introduction

Kong Ingress Controller is a popular open-source API gateway and ingress controller for Kubernetes. It provides advanced traffic management features including rate limiting, authentication, load balancing, and plugin-based extensibility. When combined with Flux CD, you get a fully GitOps-driven approach to managing your ingress infrastructure.

This guide walks you through deploying Kong Ingress Controller using Flux CD, configuring ingress routes, and applying Kong plugins declaratively.

## Prerequisites

Before you begin, ensure you have the following in place:

- A Kubernetes cluster (v1.24 or later)
- Flux CD installed and bootstrapped on the cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Setting Up the Flux Source

First, define a HelmRepository source that points to the official Kong Helm chart repository.

```yaml
# clusters/my-cluster/sources/kong-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kong
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.konghq.com
```

This resource tells Flux CD to periodically check the Kong Helm repository for updates.

## Creating the Kong Namespace

Define a namespace for the Kong Ingress Controller deployment.

```yaml
# clusters/my-cluster/namespaces/kong-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kong
  labels:
    toolkit.fluxcd.io/tenant: networking
```

## Deploying Kong via HelmRelease

Create a HelmRelease resource to deploy Kong Ingress Controller with custom configuration.

```yaml
# clusters/my-cluster/helm-releases/kong-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kong
  namespace: kong
spec:
  interval: 30m
  chart:
    spec:
      chart: kong
      version: "2.38.x"
      sourceRef:
        kind: HelmRepository
        name: kong
        namespace: flux-system
      interval: 12h
  values:
    # Enable the ingress controller
    ingressController:
      enabled: true
      # Install custom resource definitions
      installCRDs: false

    # Proxy service configuration
    proxy:
      enabled: true
      type: LoadBalancer
      annotations:
        # Add cloud provider annotations as needed
        service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
      http:
        enabled: true
        containerPort: 8000
        servicePort: 80
      tls:
        enabled: true
        containerPort: 8443
        servicePort: 443

    # Admin API configuration
    admin:
      enabled: false

    # Resource limits
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Enable autoscaling
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 5
      targetCPUUtilizationPercentage: 75
```

## Configuring an Ingress Resource

Once Kong is deployed, create an Ingress resource that routes traffic through Kong.

```yaml
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    # Specify Kong as the ingress class
    kubernetes.io/ingress.class: kong
    # Enable HTTPS redirect
    konghq.com/protocols: "https"
    konghq.com/https-redirect-status-code: "302"
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret
```

## Adding Kong Plugins

Kong's power comes from its plugin system. You can manage plugins declaratively with Flux CD using KongPlugin custom resources.

### Rate Limiting Plugin

```yaml
# apps/my-app/kong-plugins/rate-limiting.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
config:
  minute: 100
  # Limit by consumer or IP
  limit_by: ip
  policy: local
plugin: rate-limiting
```

### CORS Plugin

```yaml
# apps/my-app/kong-plugins/cors.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: cors-plugin
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
config:
  origins:
    - "https://example.com"
    - "https://www.example.com"
  methods:
    - GET
    - POST
    - PUT
    - DELETE
  headers:
    - Content-Type
    - Authorization
  max_age: 3600
  credentials: true
plugin: cors
```

### Applying Plugins to an Ingress

Reference the plugins in your Ingress resource using annotations.

```yaml
# apps/my-app/ingress-with-plugins.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
    # Apply multiple plugins (comma-separated)
    konghq.com/plugins: rate-limiting,cors-plugin
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: my-api-service
                port:
                  number: 8080
```

## Setting Up a Kustomization

Organize all Kong-related resources under a single Flux Kustomization.

```yaml
# clusters/my-cluster/kong-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kong-ingress
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: kong
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kong
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kong-kong
      namespace: kong
  timeout: 5m
```

## Monitoring the Deployment

After committing and pushing the manifests to your Git repository, Flux CD will reconcile the desired state. You can monitor the deployment with these commands.

```bash
# Check the HelmRelease status
flux get helmreleases -n kong

# Check the HelmRepository source
flux get sources helm -n flux-system

# View Kong pods
kubectl get pods -n kong

# Check the Kong proxy service and its external IP
kubectl get svc -n kong

# Verify ingress resources managed by Kong
kubectl get ingress --all-namespaces
```

## Upgrading Kong

To upgrade Kong, update the version constraint in the HelmRelease spec. Flux CD will detect the change and perform a rolling upgrade.

```yaml
# Update this section in kong-helmrelease.yaml
spec:
  chart:
    spec:
      # Update to the new version
      version: "2.39.x"
```

Commit and push the change. Flux will handle the upgrade automatically.

## Troubleshooting

If Kong is not processing traffic correctly, check the following.

```bash
# View Kong Ingress Controller logs
kubectl logs -n kong -l app.kubernetes.io/component=controller

# View Kong proxy logs
kubectl logs -n kong -l app.kubernetes.io/component=app

# Check Kong's internal configuration
kubectl exec -n kong deploy/kong-kong -- kong config dump

# Verify the IngressClass is available
kubectl get ingressclass
```

## Conclusion

Deploying Kong Ingress Controller with Flux CD gives you a fully automated, GitOps-driven ingress management solution. All configuration changes are version-controlled, auditable, and automatically applied to your cluster. Kong's rich plugin ecosystem combined with Flux CD's reconciliation loop ensures your API gateway configuration stays consistent and reproducible across environments.
