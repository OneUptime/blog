# How to Implement Active-Passive Failover with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Active-Passive, High Availability, Failover

Description: Set up active-passive cluster failover managed by Flux CD, with automated health monitoring and GitOps-driven promotion of the standby cluster.

---

## Introduction

Active-passive failover is the foundation of high availability for systems that cannot run in multiple active instances simultaneously — stateful databases, systems with leader election, or applications that require exclusive resource access. In this model, the primary cluster serves all traffic while a standby cluster remains synchronized but idle, ready to take over within minutes.

Flux CD enables GitOps-driven active-passive failover by managing both clusters from the same repository. The standby cluster runs Flux, reconciles the same application definitions, but remains behind a DNS record that receives no traffic. When the primary fails, a single Git commit or script execution promotes the standby to primary — and Flux handles the rest.

This guide implements a complete active-passive setup with automated health monitoring, DNS-based traffic control, and a tested promotion procedure.

## Prerequisites

- Two Kubernetes clusters (primary and standby) in different regions
- Flux CD bootstrapped on both clusters
- DNS provider with health-check-based failover (Route53, Cloudflare)
- Shared external state (database, object storage) accessible from both clusters
- `flux` and `kubectl` CLI access to both clusters

## Step 1: Repository Structure for Active-Passive

```
clusters/
  primary/           # Active cluster (us-east-1)
    flux-system/
    apps.yaml        # Points to apps/overlays/active
    infrastructure.yaml
  standby/           # Passive cluster (us-west-2)
    flux-system/
    apps.yaml        # Points to apps/overlays/standby
    infrastructure.yaml
apps/
  overlays/
    active/          # Full replicas, HPA enabled
      kustomization.yaml
      replica-patch.yaml
    standby/         # Minimal replicas, no external traffic
      kustomization.yaml
      replica-patch.yaml
```

```yaml
# apps/overlays/active/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
```

```yaml
# apps/overlays/standby/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 1  # Minimal footprint on standby
```

## Step 2: Configure Health-Check DNS Failover

```yaml
# Route53 health check for primary cluster
# infrastructure/aws/dns/main.tf (managed by Flux via Terraform controller)
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary-lb.us-east-1.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = 2
  request_interval  = 10

  tags = {
    Name    = "primary-cluster-health"
    ManagedBy = "flux"
  }
}

resource "aws_route53_record" "app" {
  zone_id        = var.hosted_zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary.id
  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_standby" {
  zone_id        = var.hosted_zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "standby"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.standby.dns_name
    zone_id                = aws_lb.standby.zone_id
    evaluate_target_health = true
  }
}
```

## Step 3: Implement the Promotion Procedure

When a failover is triggered (automatically via DNS or manually), promote the standby to active.

```bash
#!/bin/bash
# promote-standby-to-primary.sh
set -euo pipefail

STANDBY_CONTEXT="${1:-standby}"
echo "==> Starting promotion of standby cluster to primary..."

# 1. Verify standby is healthy
echo "Verifying standby health..."
kubectl get nodes --context "$STANDBY_CONTEXT" | grep -v NotReady

# 2. Verify standby Flux is reconciled and healthy
flux get all -A --context "$STANDBY_CONTEXT" | grep -v True && {
  echo "ERROR: Standby has unhealthy Flux resources"
  kubectl --context "$STANDBY_CONTEXT" get pods -A | grep -v Running
  exit 1
}

# 3. Scale up standby to production replica counts
echo "Scaling up standby to production replicas..."
git checkout -b "failover/$(date +%Y%m%d-%H%M%S)"
cp apps/overlays/active/replica-patch.yaml \
   apps/overlays/standby/replica-patch.yaml
git add apps/overlays/standby/replica-patch.yaml
git commit -m "failover: promote standby to primary replica count"
git push origin HEAD

echo "==> Flux will reconcile standby within its next sync interval"
echo "==> DNS health check will route traffic once pods are Ready"
echo "==> Monitor: flux get all -A --context $STANDBY_CONTEXT"
```

## Step 4: Monitor Both Clusters Continuously

```yaml
# Flux alert for standby drift detection
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: standby-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-ops
  eventSeverity: warning
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
  summary: "Standby cluster reconciliation failure"
```

```bash
# Continuous health check script (run as CronJob)
#!/bin/bash
PRIMARY_HEALTH=$(curl -sf https://app.example.com/healthz && echo "OK" || echo "FAIL")
STANDBY_HEALTH=$(kubectl get pods -n production --context standby \
  -o jsonpath='{.items[*].status.phase}' | tr ' ' '\n' | sort | uniq -c)

echo "Primary: $PRIMARY_HEALTH"
echo "Standby pods: $STANDBY_HEALTH"

if [ "$PRIMARY_HEALTH" = "FAIL" ]; then
  # Alert on-call
  curl -X POST "$PAGERDUTY_WEBHOOK" \
    -d '{"severity":"critical","message":"Primary cluster health check failing"}'
fi
```

## Step 5: Automate Failback

After the primary is restored, return traffic to it.

```bash
#!/bin/bash
# failback-to-primary.sh
set -euo pipefail

echo "==> Verifying primary cluster is healthy..."
flux get all -A --context primary | grep -c "True"

echo "==> Restoring standby to minimal replica counts..."
git checkout main
cp apps/overlays/standby/replica-patch.yaml.original \
   apps/overlays/standby/replica-patch.yaml
git add apps/overlays/standby/replica-patch.yaml
git commit -m "failback: restore standby to minimal replicas"
git push origin main

echo "==> Primary will resume serving traffic as DNS health checks recover"
```

## Best Practices

- Test the promotion script quarterly — undocumented procedures fail under pressure.
- Keep the standby running at 1 replica per service to validate health without serving traffic.
- Use the same Docker image versions on both clusters at all times via GitOps.
- Ensure database connection strings point at shared external state, not cluster-local databases.
- Configure Flux on the standby with a shorter reconciliation interval than the primary.
- Track failover events in your incident management system for post-mortems.

## Conclusion

Active-passive failover with Flux CD combines the reliability of DNS-based traffic control with the consistency of GitOps-managed configuration. Both clusters always run the same application code because they reconcile from the same Git repository — only the scale and routing differ. When the primary fails, a single Git commit is all it takes to promote the standby to full production capacity.
