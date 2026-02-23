# How to Install Terraform Enterprise on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Kubernetes, Helm, Container Orchestration

Description: Deploy Terraform Enterprise on Kubernetes using Helm charts with production-ready configurations for high availability and scaling.

---

Running Terraform Enterprise on Kubernetes gives you built-in high availability, scaling, and fits naturally into organizations already using Kubernetes for their platform. HashiCorp provides an official Helm chart that handles the deployment. This guide covers the full installation process, from cluster prerequisites to a production-ready deployment.

## Prerequisites

Before deploying, ensure you have:

- A Kubernetes cluster (1.24+) with at least 4 CPU cores and 16 GB RAM available
- kubectl configured to access your cluster
- Helm 3 installed
- A Terraform Enterprise license
- External PostgreSQL database (required for Kubernetes deployments)
- S3-compatible object storage (for state files and artifacts)
- TLS certificates for your hostname
- DNS configured to point to your cluster's ingress

```bash
# Verify your tools
kubectl version --client
helm version

# Check cluster resources
kubectl top nodes
```

## Step 1: Create a Namespace

```bash
# Create a dedicated namespace for Terraform Enterprise
kubectl create namespace terraform-enterprise
```

## Step 2: Set Up Secrets

Store sensitive configuration as Kubernetes secrets:

```bash
# Create the TLS secret
kubectl -n terraform-enterprise create secret tls tfe-tls \
  --cert=/path/to/tfe.crt \
  --key=/path/to/tfe.key

# Create the license secret
kubectl -n terraform-enterprise create secret generic tfe-license \
  --from-literal=license="$TFE_LICENSE"

# Create the encryption password secret
kubectl -n terraform-enterprise create secret generic tfe-encryption \
  --from-literal=password="$(openssl rand -hex 32)"

# Create the database credentials secret
kubectl -n terraform-enterprise create secret generic tfe-database \
  --from-literal=host="postgres.internal.example.com" \
  --from-literal=username="terraform" \
  --from-literal=password="your-db-password" \
  --from-literal=name="terraform_enterprise" \
  --from-literal=sslmode="require"

# Create the object storage credentials secret
kubectl -n terraform-enterprise create secret generic tfe-object-storage \
  --from-literal=s3-bucket="tfe-data" \
  --from-literal=s3-region="us-east-1" \
  --from-literal=aws-access-key-id="AKIA..." \
  --from-literal=aws-secret-access-key="..."
```

## Step 3: Add the HashiCorp Helm Repository

```bash
# Add the HashiCorp Helm chart repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Search for available versions
helm search repo hashicorp/terraform-enterprise --versions
```

## Step 4: Create the Values File

Create a Helm values file for your deployment:

```yaml
# values.yaml
# Terraform Enterprise Helm chart configuration

replicaCount: 1  # Start with 1, scale up after testing

image:
  repository: images.releases.hashicorp.com/hashicorp/terraform-enterprise
  tag: latest  # Pin to a specific version in production

# TFE configuration
tfe:
  hostname: tfe.example.com

  # License configuration
  license:
    secretName: tfe-license
    secretKey: license

  # Encryption password
  encryption:
    secretName: tfe-encryption
    secretKey: password

  # Operational mode - must be "external" for Kubernetes
  operationalMode: external

  # Database configuration
  database:
    secretName: tfe-database
    hostKey: host
    usernameKey: username
    passwordKey: password
    nameKey: name
    sslmodeKey: sslmode
    parameters: "sslmode=require"

  # Object storage configuration
  objectStorage:
    type: s3
    secretName: tfe-object-storage
    s3:
      bucketKey: s3-bucket
      regionKey: s3-region
      accessKeyIdKey: aws-access-key-id
      secretAccessKeyKey: aws-secret-access-key

# TLS configuration
tls:
  secretName: tfe-tls
  certKey: tls.crt
  keyKey: tls.key

# Ingress configuration
ingress:
  enabled: true
  className: nginx  # or your ingress class
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/proxy-body-size: "200m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
  hosts:
    - host: tfe.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tfe-tls
      hosts:
        - tfe.example.com

# Resource requests and limits
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"

# Pod security context
securityContext:
  capabilities:
    add:
      - IPC_LOCK

# Service configuration
service:
  type: ClusterIP
  port: 443

# Health checks
livenessProbe:
  httpGet:
    path: /_health_check
    port: 443
    scheme: HTTPS
  initialDelaySeconds: 300
  periodSeconds: 30
  timeoutSeconds: 10

readinessProbe:
  httpGet:
    path: /_health_check
    port: 443
    scheme: HTTPS
  initialDelaySeconds: 60
  periodSeconds: 10
  timeoutSeconds: 5
```

## Step 5: Install with Helm

```bash
# Install Terraform Enterprise
helm install terraform-enterprise hashicorp/terraform-enterprise \
  --namespace terraform-enterprise \
  --values values.yaml \
  --wait \
  --timeout 15m

# Monitor the deployment
kubectl -n terraform-enterprise get pods -w
```

The installation takes several minutes. Watch the pod status until it reaches `Running` and `Ready`.

```bash
# Check deployment status
kubectl -n terraform-enterprise get all

# View pod logs during startup
kubectl -n terraform-enterprise logs -f deployment/terraform-enterprise
```

## Step 6: Verify the Installation

```bash
# Check the health endpoint
kubectl -n terraform-enterprise port-forward svc/terraform-enterprise 8443:443

# In another terminal
curl -k https://localhost:8443/_health_check

# Or if your ingress is configured, check directly
curl -k https://tfe.example.com/_health_check
```

Expected healthy response:
```json
{"postgres":"UP","redis":"UP","vault":"UP"}
```

## Step 7: Initial Setup

Navigate to `https://tfe.example.com` in your browser:

1. Create the initial admin account
2. Create your organization
3. Configure SMTP for email notifications (optional)
4. Set up VCS connections

## Scaling Terraform Enterprise

Once your initial deployment is stable, scale up for high availability:

```yaml
# Update values.yaml for production
replicaCount: 2

# Add pod disruption budget
podDisruptionBudget:
  minAvailable: 1

# Add pod anti-affinity to spread across nodes
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - terraform-enterprise
          topologyKey: kubernetes.io/hostname
```

```bash
# Apply the updated configuration
helm upgrade terraform-enterprise hashicorp/terraform-enterprise \
  --namespace terraform-enterprise \
  --values values.yaml
```

## Monitoring

Set up monitoring with Prometheus:

```yaml
# Add to values.yaml
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

```bash
# Check pod metrics
kubectl -n terraform-enterprise top pods

# View events for troubleshooting
kubectl -n terraform-enterprise get events --sort-by='.lastTimestamp'
```

## Upgrading Terraform Enterprise

```bash
# Check the current version
helm list -n terraform-enterprise

# Update the Helm repository
helm repo update

# Upgrade to a new version
helm upgrade terraform-enterprise hashicorp/terraform-enterprise \
  --namespace terraform-enterprise \
  --values values.yaml \
  --set image.tag=v202402-1

# Monitor the rolling update
kubectl -n terraform-enterprise rollout status deployment/terraform-enterprise
```

Helm performs a rolling update, so there is minimal downtime during upgrades.

## Backup Considerations

With external PostgreSQL and S3, your backup strategy focuses on the database:

```bash
# Backup the PostgreSQL database
pg_dump -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -F c \
  -f "tfe-backup-$(date +%Y%m%d).dump"

# Backup the Kubernetes secrets
kubectl -n terraform-enterprise get secret tfe-encryption -o yaml > tfe-encryption-backup.yaml
kubectl -n terraform-enterprise get secret tfe-license -o yaml > tfe-license-backup.yaml
```

The encryption password secret is critical. If you lose it, you cannot decrypt your stored data. Back it up securely.

## Troubleshooting

```bash
# Pod not starting
kubectl -n terraform-enterprise describe pod <pod-name>
kubectl -n terraform-enterprise logs <pod-name> --previous

# Database connection issues
kubectl -n terraform-enterprise exec -it <pod-name> -- \
  psql "postgresql://terraform:password@postgres.internal.example.com/terraform_enterprise?sslmode=require" \
  -c "SELECT 1"

# Ingress issues
kubectl -n terraform-enterprise describe ingress
kubectl -n terraform-enterprise get events | grep ingress

# Check resource usage
kubectl -n terraform-enterprise top pods
```

## Summary

Running Terraform Enterprise on Kubernetes requires external PostgreSQL and S3 storage but gives you the benefits of container orchestration - scaling, rolling updates, and self-healing. Use the official Helm chart for deployment, configure production-ready settings including resource limits and anti-affinity, and implement monitoring from the start. The Kubernetes deployment model fits well into organizations that already operate a Kubernetes platform.
