# How to Use HelmRelease for Deploying External-DNS with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, External-DNS, DNS Management

Description: Learn how to deploy External-DNS on Kubernetes using a Flux HelmRelease for automated DNS record management tied to your services and ingresses.

---

External-DNS automates the management of DNS records by watching Kubernetes resources such as Services and Ingresses and creating corresponding DNS entries in your DNS provider. Deploying External-DNS through a Flux HelmRelease ensures your DNS automation is declaratively managed, version-controlled, and automatically reconciled from Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Access credentials for a supported DNS provider (AWS Route 53, Google Cloud DNS, Cloudflare, Azure DNS, etc.)

## Creating the HelmRepository

External-DNS publishes its Helm chart through the Kubernetes SIGs repository.

```yaml
# helmrepository-external-dns.yaml - External-DNS Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-dns
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/external-dns
```

## Creating Provider Credentials

Before deploying External-DNS, create a Kubernetes Secret containing your DNS provider credentials. This example uses AWS Route 53.

```yaml
# secret-external-dns.yaml - AWS credentials for External-DNS
apiVersion: v1
kind: Secret
metadata:
  name: external-dns-aws
  namespace: external-dns
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
```

For production, use a sealed secret or a secrets management tool like SOPS integrated with Flux.

## Deploying External-DNS with HelmRelease

The following HelmRelease deploys External-DNS configured for AWS Route 53.

```yaml
# helmrelease-external-dns.yaml - External-DNS deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-dns
  namespace: external-dns
spec:
  interval: 15m
  chart:
    spec:
      chart: external-dns
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: external-dns
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 5m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 5m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # DNS provider configuration
    provider:
      name: aws

    # Limit External-DNS to specific hosted zones
    domainFilters:
      - example.com

    # Policy: sync will create and delete records, upsert-only will only create
    policy: upsert-only

    # TXT record owner ID to identify records managed by this instance
    txtOwnerId: "flux-external-dns"

    # TXT record prefix to avoid conflicts
    txtPrefix: "extdns-"

    # Sources to watch for DNS records
    sources:
      - service
      - ingress

    # Registry type for tracking ownership
    registry: txt

    # Sync interval
    interval: "1m"

    # Resource limits
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 128Mi

    # Service account configuration for IRSA (IAM Roles for Service Accounts)
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/external-dns"

    # Environment variables for AWS credentials (alternative to IRSA)
    # env:
    #   - name: AWS_SHARED_CREDENTIALS_FILE
    #     value: /etc/aws/credentials

    # Extra volumes for mounting credentials
    # extraVolumes:
    #   - name: aws-credentials
    #     secret:
    #       secretName: external-dns-aws
    # extraVolumeMounts:
    #   - name: aws-credentials
    #     mountPath: /etc/aws
    #     readOnly: true
```

## Configuring for Other Providers

### Cloudflare

```yaml
# Snippet: Cloudflare provider configuration
values:
  provider:
    name: cloudflare
  env:
    - name: CF_API_TOKEN
      valueFrom:
        secretKeyRef:
          name: cloudflare-api-token
          key: api-token
  domainFilters:
    - example.com
  policy: sync
  txtOwnerId: "flux-external-dns"
```

### Google Cloud DNS

```yaml
# Snippet: Google Cloud DNS provider configuration
values:
  provider:
    name: google
  extraArgs:
    - --google-project=my-gcp-project
    - --google-zone-visibility=public
  domainFilters:
    - example.com
  policy: sync
```

## Annotating Services for DNS

Once External-DNS is running, annotate your Services or Ingresses to create DNS records automatically.

```yaml
# service.yaml - Service with External-DNS annotation
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
  namespace: apps
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-web-app
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease external-dns -n external-dns

# Verify External-DNS is running
kubectl get pods -n external-dns

# Check External-DNS logs for DNS record creation
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns

# Verify DNS records were created
dig app.example.com
```

## Summary

Deploying External-DNS through a Flux HelmRelease from `https://kubernetes-sigs.github.io/external-dns` automates DNS record lifecycle management alongside your Kubernetes workloads. By managing the deployment declaratively in Git, you ensure that DNS automation configuration is versioned, auditable, and automatically reconciled by Flux, eliminating manual DNS record management and reducing the risk of configuration drift.
