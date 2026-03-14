# How to Deploy ExternalDNS with Azure DNS Provider via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ExternalDNS, Azure DNS, DNS, Kubernetes, GitOps, Networking

Description: Learn how to deploy ExternalDNS with the Azure DNS provider using Flux CD HelmRelease to automatically manage DNS records for Kubernetes services.

---

## Introduction

ExternalDNS automates DNS record management for Kubernetes Services and Ingresses. When you deploy a Service with `type: LoadBalancer` or an Ingress resource, ExternalDNS automatically creates the corresponding DNS record in your DNS provider. Managing ExternalDNS through Flux CD ensures consistent deployment across clusters and provides a Git-based audit trail for DNS configuration changes.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A Azure DNS account with DNS management access
- A domain hosted in Azure DNS
- kubectl and flux CLI installed

## Step 1: Add the ExternalDNS Helm Repository

```yaml
# clusters/production/sources/externaldns-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-dns
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/external-dns/
```

## Step 2: Create the Provider Credentials Secret

```bash
# Create namespace for ExternalDNS
kubectl create namespace external-dns

# Create credentials secret (provider-specific)
kubectl create secret generic azure-config \
  --from-literal=key=your-api-key-or-credentials \
  --namespace=external-dns
```

## Step 3: Deploy ExternalDNS via Flux HelmRelease

```yaml
# clusters/production/apps/external-dns.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-dns
  namespace: external-dns
spec:
  interval: 1h
  chart:
    spec:
      chart: external-dns
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: external-dns
        namespace: flux-system
  values:
    provider: azure-dns
    # Domain filter: only manage records for these zones
    domainFilters:
      - your-domain.com
    # Policy: sync (create and delete) or upsert-only (create, no delete)
    policy: sync
    # Source types to watch
    sources:
      - service
      - ingress
    # Annotation filter to only manage annotated resources
    annotationFilter: "externaldns.alpha.kubernetes.io/external=true"
    # TXT record for ownership tracking
    txtOwnerId: "production-cluster"
    # Provider-specific configuration
    env:
      - name: PROVIDER_KEY
        valueFrom:
          secretKeyRef:
            name: azure-config
            key: key
    # RBAC
    serviceAccount:
      create: true
      name: external-dns
    # Resources
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi
    # Metrics
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/production/infrastructure/external-dns-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: external-dns
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/apps/external-dns
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: external-dns
      namespace: external-dns
  timeout: 5m
```

## Step 5: Annotate Services for DNS Management

```yaml
# Example Service that ExternalDNS will manage
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
  annotations:
    # Tell ExternalDNS to manage this service's DNS
    external-dns.alpha.kubernetes.io/hostname: "myapp.your-domain.com"
    external-dns.alpha.kubernetes.io/ttl: "300"
    # Match the annotation filter above
    externaldns.alpha.kubernetes.io/external: "true"
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

For Ingress resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: myapp
  annotations:
    externaldns.alpha.kubernetes.io/external: "true"
spec:
  rules:
    - host: myapp.your-domain.com  # ExternalDNS creates A/CNAME for this
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Step 6: Verify DNS Record Creation

```bash
# Check ExternalDNS is running
flux get helmreleases external-dns -n external-dns

# View ExternalDNS logs to see DNS operations
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns --tail=50

# Verify DNS records were created (from outside the cluster)
dig myapp.your-domain.com +short

# Check ownership TXT records
dig _externaldns.myapp.your-domain.com TXT +short
```

## Best Practices

- Use `policy: upsert-only` initially during testing to prevent ExternalDNS from deleting existing records.
- Always set `domainFilters` to limit ExternalDNS to managing only your cluster's domains.
- Use `txtOwnerId` to uniquely identify each cluster; this prevents multi-cluster DNS record conflicts.
- Use the `annotationFilter` to opt-in specific services rather than managing all LoadBalancer services automatically.
- Store provider credentials in SOPS-encrypted secrets in your fleet repository.
- Set up Prometheus alerts on ExternalDNS for failed DNS record operations.

## Conclusion

ExternalDNS deployed via Flux CD provides automated, GitOps-managed DNS record lifecycle for Kubernetes services. By combining ExternalDNS's Azure DNS provider with Flux CD's reconciliation, you get a system where DNS records are automatically created when services are deployed and removed when they are deleted, with all configuration tracked in Git.
