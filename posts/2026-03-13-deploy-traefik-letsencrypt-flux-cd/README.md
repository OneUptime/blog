# How to Deploy Traefik with Let's Encrypt via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Traefik, Let's Encrypt, TLS, Ingress, HelmRelease

Description: Deploy Traefik ingress controller with automatic Let's Encrypt TLS certificate provisioning using Flux CD HelmRelease for production-ready HTTPS termination.

---

## Introduction

Traefik is a cloud-native reverse proxy and ingress controller that was built with Kubernetes and Let's Encrypt in mind from the start. Its native ACME client can automatically provision and renew TLS certificates from Let's Encrypt without any additional tooling like cert-manager - making the initial setup simpler and reducing the number of moving parts in your TLS infrastructure.

Deploying Traefik through Flux CD gives you a reproducible, version-controlled ingress layer that automatically manages TLS for all your services. When you add a new service to your cluster, a simple Ingress or IngressRoute resource is all you need - Traefik handles certificate provisioning, renewal, and HTTPS termination automatically.

This guide deploys Traefik using Flux CD HelmRelease with Let's Encrypt ACME certificate provisioning using both HTTP-01 and DNS-01 challenges, configuring it for production use with proper resource limits and high availability.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A public domain name with DNS pointing to your cluster's LoadBalancer IP
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- Port 80 accessible from the internet (for HTTP-01 ACME challenge)

## Step 1: Add the Traefik HelmRepository

Register the official Traefik Helm chart repository with Flux CD.

```yaml
# infrastructure/traefik/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: traefik
  namespace: flux-system
spec:
  interval: 1h
  url: https://traefik.github.io/charts
```

## Step 2: Create a PersistentVolumeClaim for ACME Data

Traefik stores Let's Encrypt certificate data on disk. Persist it to survive pod restarts.

```yaml
# infrastructure/traefik/acme-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: traefik-acme-storage
  namespace: traefik
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: standard
```

## Step 3: Deploy Traefik with Let's Encrypt

Configure the HelmRelease with ACME certificate provisioning.

```yaml
# infrastructure/traefik/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: traefik
  namespace: traefik
spec:
  interval: 30m
  chart:
    spec:
      chart: traefik
      version: ">=28.0.0 <29.0.0"
      sourceRef:
        kind: HelmRepository
        name: traefik
        namespace: flux-system
      interval: 12h
  values:
    # Entry points configuration
    ports:
      web:
        port: 80
        exposedPort: 80
        # Redirect all HTTP to HTTPS
        redirectTo:
          port: websecure
      websecure:
        port: 443
        exposedPort: 443
        tls:
          enabled: true

    # Let's Encrypt ACME configuration
    certificatesResolvers:
      letsencrypt:
        acme:
          # Use staging for testing, change to production when ready
          # caServer: https://acme-staging-v02.api.letsencrypt.org/directory
          caServer: https://acme-v02.api.letsencrypt.org/directory
          email: platform-team@example.com
          storage: /data/acme.json
          # HTTP-01 challenge (requires port 80 accessible from internet)
          httpChallenge:
            entryPoint: web

    # Persist ACME certificate data
    persistence:
      enabled: true
      existingClaim: traefik-acme-storage
      path: /data
      accessMode: ReadWriteOnce

    # Dashboard configuration
    ingressRoute:
      dashboard:
        enabled: false  # Expose manually with authentication

    # Prometheus metrics
    metrics:
      prometheus:
        enabled: true
        serviceMonitor:
          enabled: true
          namespace: monitoring

    # Resource allocation
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: "1"
        memory: 512Mi

    # Single replica when using ReadWriteOnce PVC
    # For HA, use ReadWriteMany PVC or external certificate storage
    replicaCount: 1

    # ServiceAccount permissions
    rbac:
      enabled: true
```

## Step 4: Configure the Flux Kustomization

Apply Traefik resources with proper namespace and dependency management.

```yaml
# clusters/production/traefik-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: traefik
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/traefik
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: traefik
      namespace: traefik
  timeout: 10m
```

## Step 5: Create Your First TLS Ingress

With Traefik running, create an Ingress that automatically gets a Let's Encrypt certificate.

```yaml
# apps/backend/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server-ingress
  namespace: backend
  annotations:
    # Tell Traefik which certificate resolver to use
    traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
    # Enable TLS on this ingress
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  ingressClassName: traefik
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
  tls:
    - hosts:
        - api.example.com
      # Traefik manages this secret automatically
      secretName: api-example-tls
```

## Step 6: Verify TLS is Working

Validate that Let's Encrypt certificates are being issued and HTTPS is working.

```bash
# Check Traefik pod status
kubectl get pods -n traefik

# Verify HelmRelease is ready
flux get helmrelease traefik -n traefik

# Check Traefik logs for ACME activity
kubectl logs -n traefik deployment/traefik | grep -i "acme\|certificate\|tls"

# Test HTTPS connectivity
curl -I https://api.example.com/health

# Check certificate details
echo | openssl s_client -servername api.example.com -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates

# Access Traefik dashboard (temporary port-forward)
kubectl port-forward -n traefik svc/traefik 9000:9000 &
curl http://localhost:9000/dashboard/
```

## Best Practices

- Always test with Let's Encrypt staging first to avoid hitting production rate limits; switch `caServer` to the production URL only when everything works correctly.
- Store ACME data in a persistent volume and back it up regularly; losing the ACME account data means re-registering and waiting for rate limit windows.
- For high availability deployments, switch to DNS-01 challenges with a shared storage backend (Redis or a shared filesystem) to avoid certificate issuance conflicts between replicas.
- Enable Traefik's access logs in JSON format and ship to your log aggregation system for detailed request tracking.
- Use Traefik Middleware resources for security headers, basic authentication, and rate limiting rather than handling these in application code.
- Monitor certificate expiration through Traefik's Prometheus metrics and set alerts for certificates expiring within 30 days.

## Conclusion

Traefik with automatic Let's Encrypt TLS, deployed through Flux CD, provides a production-ready ingress layer where TLS certificate management is completely hands-off. New services get HTTPS automatically just by defining an Ingress resource with the appropriate annotations. The GitOps model ensures your Traefik configuration is reproducible across environments, and certificate data persistence protects against unnecessary re-issuance.
