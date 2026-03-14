# How to Deploy Ambassador Edge Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ambassador, Emissary-ingress, API Gateway, HelmRelease

Description: Deploy Ambassador Edge Stack (Emissary-ingress) API Gateway using Flux CD HelmRelease for production-grade API management built on Envoy proxy.

---

## Introduction

Ambassador Edge Stack, now maintained as Emissary-ingress under the CNCF, is a Kubernetes-native API gateway built on the Envoy proxy. It is designed from the ground up for Kubernetes, using Custom Resource Definitions to manage routing, authentication, rate limiting, and TLS - making it an excellent fit for GitOps workflows managed by Flux CD.

Unlike gateways that were adapted for Kubernetes, Ambassador's entire configuration model is expressed as Kubernetes objects. Every routing rule, every authentication policy, and every upstream service definition is a CRD that lives in your Git repository and is reconciled by Flux CD. This native integration means Ambassador and Flux CD work together seamlessly without additional tooling.

This guide deploys Ambassador Edge Stack using Flux CD HelmRelease and configures the foundational components needed for production API management.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- A domain name with DNS control (for TLS certificate provisioning)
- cert-manager installed for TLS (optional but recommended)

## Step 1: Add the Ambassador HelmRepository

Register the Ambassador Helm chart repository with Flux CD.

```yaml
# infrastructure/ambassador/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: datawire
  namespace: flux-system
spec:
  interval: 1h
  url: https://app.getambassador.io
```

```yaml
# infrastructure/ambassador/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ambassador
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Deploy Ambassador Edge Stack

Deploy Ambassador with the HelmRelease, configuring TLS and the Admin UI.

```yaml
# infrastructure/ambassador/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ambassador
  namespace: ambassador
spec:
  interval: 30m
  chart:
    spec:
      chart: emissary-ingress
      version: ">=3.0.0 <4.0.0"
      sourceRef:
        kind: HelmRepository
        name: datawire
        namespace: flux-system
      interval: 12h
  values:
    # Replica count for high availability
    replicaCount: 3

    # Service configuration
    service:
      type: LoadBalancer
      ports:
        - name: http
          port: 80
          targetPort: 8080
        - name: https
          port: 443
          targetPort: 8443

    # Enable Envoy access logs
    env:
      AMBASSADOR_ENVOY_BASE_ID: "0"

    # Resource allocation
    resources:
      requests:
        cpu: 200m
        memory: 300Mi
      limits:
        cpu: "1"
        memory: 1500Mi

    # Pod disruption budget for rolling upgrades
    podDisruptionBudget:
      minAvailable: 2

    # Spread pods across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: emissary-ingress
              topologyKey: kubernetes.io/hostname

    # Enable Prometheus metrics
    adminService:
      create: true
      type: ClusterIP
      port: 8877

    serviceMonitor:
      enabled: true
```

## Step 3: Configure the AmbassadorListener

Ambassador uses a Listener CRD to define which ports it listens on and what protocols it handles.

```yaml
# infrastructure/ambassador/listener.yaml
apiVersion: getambassador.io/v3alpha1
kind: Listener
metadata:
  name: http-listener
  namespace: ambassador
spec:
  port: 8080
  protocol: HTTPS  # Ambassador handles HTTP->HTTPS redirect
  securityModel: XFP  # Use X-Forwarded-Proto header
  hostBinding:
    namespace:
      from: ALL
---
apiVersion: getambassador.io/v3alpha1
kind: Listener
metadata:
  name: https-listener
  namespace: ambassador
spec:
  port: 8443
  protocol: HTTPS
  securityModel: XFP
  hostBinding:
    namespace:
      from: ALL
```

## Step 4: Configure a Host with TLS

Define an Ambassador Host resource for your domain, with automatic TLS via ACME.

```yaml
# infrastructure/ambassador/host.yaml
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: api-example-host
  namespace: ambassador
spec:
  hostname: api.example.com
  acmeProvider:
    # Use Let's Encrypt for automatic TLS
    authority: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecret:
      name: api-example-acme-key
  tlsSecret:
    name: api-example-tls
  requestPolicy:
    insecure:
      # Redirect HTTP to HTTPS
      action: Redirect
```

## Step 5: Deploy with Flux Kustomization

Wire together the Ambassador deployment with proper ordering.

```yaml
# clusters/production/ambassador-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ambassador
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/ambassador
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure-controllers
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ambassador
      namespace: ambassador
  timeout: 10m
```

## Step 6: Verify Ambassador Deployment

Validate that Ambassador is running and routing correctly.

```bash
# Check Ambassador pods
kubectl get pods -n ambassador

# Verify HelmRelease status
flux get helmrelease ambassador -n ambassador

# Check Ambassador diagnostics
kubectl port-forward -n ambassador svc/ambassador-admin 8877:8877 &
curl http://localhost:8877/ambassador/v0/diag/

# Get the LoadBalancer IP
kubectl get svc ambassador -n ambassador

# Test routing (after configuring a Mapping)
curl -I https://api.example.com/health
```

## Best Practices

- Deploy Ambassador with at least 3 replicas and configure PodDisruptionBudget to ensure zero-downtime during upgrades; Ambassador upgrades require careful rolling deployment.
- Use Ambassador's rate-limiting service integration rather than implementing rate limiting in application code; this gives you consistent enforcement across all routes.
- Enable Envoy's access log in JSON format and ship to your log aggregation system for API traffic analysis.
- Use Ambassador's `circuit breaker` configuration on Mappings for services that may be slow or unreliable; this prevents cascading failures.
- Monitor Ambassador through its Prometheus metrics; key metrics are request latency, error rates, and upstream connection counts.
- Test Ambassador configuration changes in a staging environment first; the CRD model validates YAML syntax but not all semantic errors.

## Conclusion

Ambassador Edge Stack deployed through Flux CD provides a Kubernetes-native API gateway that is fully aligned with GitOps principles. Every routing decision, TLS configuration, and security policy is a CRD in your Git repository, reconciled automatically and consistently by Flux CD. As your APIs grow in complexity, the declarative model scales with you - maintaining auditability and consistency regardless of how many services or routes you manage.
