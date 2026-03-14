# How to Handle Flux Recovery After Cloud Provider Outage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Multi-Cloud, High Availability

Description: Design Flux CD setups to withstand cloud provider outages using multi-region and multi-cloud strategies with GitOps-driven failover.

---

## Introduction

Cloud provider outages are rare but impactful. AWS us-east-1, GCP us-central1, and Azure East US have all experienced significant outages that took down thousands of applications. Teams that treated "in the cloud" as equivalent to "highly available" learned painful lessons. True resilience requires designing for cloud provider failure as a first-class scenario.

Flux CD is uniquely well-positioned to help with cloud provider resilience because the desired state of your entire infrastructure lives in Git - outside any single cloud provider. When a region or provider fails, Flux can bootstrap a replacement cluster in a different region or provider and reconcile it to the same state within minutes.

This guide covers designing your Flux repository for multi-region resilience, implementing active-passive failover, and automating recovery when a cloud provider experiences an outage.

## Prerequisites

- Flux CD managing at least one production cluster
- Access to a second cloud provider or region for failover
- DNS management capable of traffic shifting (Route53, Cloudflare, etc.)
- Object storage in multiple regions for etcd backups and secrets
- `flux` and `kubectl` CLI tools

## Step 1: Structure Your Repository for Multi-Cloud

Organize your Git repository so cluster-specific configuration is isolated from shared infrastructure definitions.

```plaintext
clusters/
  aws-us-east-1/          # Primary cluster
    flux-system/
    apps.yaml
    infrastructure.yaml
  aws-us-west-2/          # Warm standby cluster
    flux-system/
    apps.yaml
    infrastructure.yaml
  gcp-us-central1/        # Cold standby / disaster recovery
    flux-system/
    apps.yaml
    infrastructure.yaml
infrastructure/
  base/                   # Shared across all clusters
    cert-manager/
    ingress-nginx/
  aws/                    # AWS-specific resources
  gcp/                    # GCP-specific resources
apps/
  base/                   # Shared app definitions
  overlays/
    production/           # Production-grade settings
    dr/                   # DR-optimized settings (smaller, faster)
```

## Step 2: Deploy a Warm Standby Cluster

A warm standby runs the same Flux configuration but at reduced replica counts. It can be promoted to primary within minutes.

```yaml
# clusters/aws-us-west-2/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/overlays/standby  # Uses reduced replica counts
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

```yaml
# apps/overlays/standby/replica-patch.yaml
# Patch to run 1 replica in standby mode
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 1  # Reduced from production's 3
```

## Step 3: Configure Health-Based Failover

Use Route53 or Cloudflare health checks to automatically shift traffic when the primary region fails.

```yaml
# Terraform for Route53 health check failover (stored in Git)
# infrastructure/aws/dns/failover.tf
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.internal.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = 3
  request_interval  = 10
}

resource "aws_route53_record" "app_primary" {
  zone_id        = var.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "primary"
  failover_routing_policy {
    type = "PRIMARY"
  }
  health_check_id = aws_route53_health_check.primary.id
  alias {
    name                   = var.primary_lb_dns
    zone_id                = var.primary_lb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 4: Automate Standby Promotion via Git

When an outage is confirmed, promote the standby by updating the Git repository. Flux on the standby cluster will reconcile the change.

```bash
#!/bin/bash
# promote-standby.sh - Run when primary region fails
set -euo pipefail

REGION="${1:-aws-us-west-2}"
echo "==> Promoting $REGION to primary..."

# Update replica counts in Git
sed -i 's/replicas: 1/replicas: 3/' \
  apps/overlays/standby/replica-patch.yaml

# Switch DNS weights (if using weighted routing)
git add apps/overlays/standby/replica-patch.yaml
git commit -m "failover: promote $REGION to primary"
git push origin main

echo "==> Flux on $REGION will reconcile within $(flux get kustomizations -n flux-system | grep interval) minutes"
echo "==> Monitor: flux get all -A --context $REGION"
```

## Step 5: Handle Cross-Region Secret Synchronization

Secrets must be available in the standby region before failover.

```yaml
# Use External Secrets Operator with a multi-region secret store
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1  # Primary region
      # ESO will fall back to us-west-2 if primary is unavailable
      additionalRoles:
        - roleArn: arn:aws:iam::123456789:role/eso-role
```

```bash
# Validate secrets are accessible from standby region
KUBECONFIG=/tmp/standby-kubeconfig.yaml \
  kubectl get externalsecrets -A
```

## Step 6: Run Regular Failover Drills

Test the failover procedure quarterly so it is practiced, not panicked.

```bash
# Failover drill checklist
# 1. Confirm standby cluster is healthy
flux get all -A --context aws-us-west-2

# 2. Verify application health on standby
kubectl get pods -A --context aws-us-west-2 | grep -v Running

# 3. Test DNS failover (without actually failing over)
# Use a test subdomain pointing at standby
curl -f https://dr-test.example.com/health

# 4. Measure RTO by timing a simulated failover
time bash promote-standby.sh aws-us-west-2
```

## Best Practices

- Never store secrets exclusively in a single cloud provider's secret manager - use cross-region replication.
- Keep warm standby costs low with reduced replica counts managed by Flux overlays.
- Practice failover drills quarterly so the procedure is documented and tested, not improvised.
- Use GitOps for DNS and load balancer configuration so failover state is version-controlled.
- Set up cross-region object storage replication for etcd backups and Flux artifacts.
- Document your RTO and RPO targets and validate them during drills.

## Conclusion

Cloud provider outages are survivable with the right architecture. Flux CD's Git-based model means your cluster state definition is inherently multi-cloud - it lives in Git, not in any single provider. By maintaining a warm standby cluster, automating DNS-based failover, and practicing the promotion procedure, you can achieve sub-15-minute RTO even for complete regional failures.
