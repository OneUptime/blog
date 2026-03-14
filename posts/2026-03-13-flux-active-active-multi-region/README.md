# How to Implement Active-Active Multi-Region with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Multi-Region, High Availability, Active-Active, Global Load Balancing

Description: Deploy active-active multi-region architecture using Flux CD, with each region serving live traffic and GitOps managing consistent configuration across all clusters.

---

## Introduction

Active-active multi-region architecture is the gold standard for global applications: every region serves real user traffic, and the loss of any single region results in only a partial capacity reduction, not a complete outage. Users are routed to the nearest healthy region, providing both resilience and low latency.

Flux CD is an ideal tool for managing active-active deployments because it can reconcile the same application definitions across multiple clusters simultaneously, ensuring configuration consistency across regions while allowing region-specific customization through Kustomize overlays.

This guide covers the repository structure, per-region customization, global load balancing, and the operational considerations unique to active-active deployments.

## Prerequisites

- Kubernetes clusters in at least two regions (e.g., us-east-1, eu-west-1, ap-southeast-1)
- Flux CD bootstrapped on all clusters
- Global DNS/load balancing service (Cloudflare, Route53 with latency routing, or GKE Traffic Director)
- Shared data layer that supports multi-region access (CockroachDB, Spanner, DynamoDB Global Tables)
- `flux` and `kubectl` CLI access to all clusters

## Step 1: Repository Structure for Multi-Region

```
clusters/
  us-east-1/
    flux-system/
    apps.yaml
  eu-west-1/
    flux-system/
    apps.yaml
  ap-southeast-1/
    flux-system/
    apps.yaml
apps/
  base/                  # Shared application definitions
    my-app/
      deployment.yaml
      service.yaml
      hpa.yaml
  overlays/
    us-east-1/           # Region-specific config
      kustomization.yaml
      region-config.yaml
    eu-west-1/
      kustomization.yaml
      region-config.yaml
    ap-southeast-1/
      kustomization.yaml
      region-config.yaml
```

## Step 2: Region-Specific Kustomize Overlays

Each region overlay customizes shared base manifests with region-specific values.

```yaml
# apps/overlays/us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/my-app
patches:
  - path: region-config.yaml
    target:
      kind: Deployment
      name: my-app
```

```yaml
# apps/overlays/us-east-1/region-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: my-app
          env:
            - name: REGION
              value: us-east-1
            - name: DB_HOST
              value: cockroachdb-us-east-1.example.com
            - name: REPLICA_COUNT
              value: "3"
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: my-app
              topologyKey: kubernetes.io/hostname
```

## Step 3: Per-Cluster Kustomization in Flux

```yaml
# clusters/us-east-1/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/overlays/us-east-1
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

Repeat for eu-west-1 and ap-southeast-1, pointing at their respective overlay paths.

## Step 4: Configure Global Load Balancing

Use Cloudflare Load Balancing with health checks to route users to the nearest healthy region.

```yaml
# infrastructure/cloudflare/load-balancer.tf
resource "cloudflare_load_balancer" "global" {
  zone_id          = var.cloudflare_zone_id
  name             = "app.example.com"
  fallback_pool_id = cloudflare_load_balancer_pool.us_east_1.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east_1.id,
    cloudflare_load_balancer_pool.eu_west_1.id,
    cloudflare_load_balancer_pool.ap_southeast_1.id,
  ]
  steering_policy  = "geo"  # Route based on user geography
  proxied          = true

  rules {
    name      = "eu-users"
    condition = "ip.src.country in {\"DE\" \"FR\" \"GB\" \"NL\"}"
    overrides {
      steering_policy  = "off"
      default_pool_ids = [cloudflare_load_balancer_pool.eu_west_1.id]
    }
  }
}

resource "cloudflare_load_balancer_pool" "us_east_1" {
  name = "us-east-1"
  origins {
    name    = "us-east-1-lb"
    address = "k8s-lb.us-east-1.example.com"
    enabled = true
  }
  health_check_id = cloudflare_healthcheck.us_east_1.id
}
```

## Step 5: Synchronize Configuration Changes Across All Regions

A key advantage of Flux is that a single Git commit propagates to all regions simultaneously.

```bash
# Deploy a new application version to all regions
# 1. Update the image tag in the base manifest
sed -i 's/my-app:v1.2.2/my-app:v1.2.3/' apps/base/my-app/deployment.yaml
git add apps/base/my-app/deployment.yaml
git commit -m "chore: bump my-app to v1.2.3"
git push origin main

# 2. Monitor rollout across all regions in parallel
for CONTEXT in us-east-1 eu-west-1 ap-southeast-1; do
  echo "==> $CONTEXT:"
  flux get kustomizations -A --context "$CONTEXT" &
done
wait
```

## Step 6: Handle Region-Specific Failures

When one region fails, the global load balancer routes around it automatically. Flux on healthy regions is unaffected.

```bash
# Check regional health
for CONTEXT in us-east-1 eu-west-1 ap-southeast-1; do
  HEALTHY=$(kubectl get pods -n production --context "$CONTEXT" \
    -o jsonpath='{.items[*].status.phase}' | tr ' ' '\n' | grep -c Running || echo 0)
  echo "$CONTEXT: $HEALTHY healthy pods"
done

# If a region needs to be disabled for maintenance
# Update the Cloudflare pool to disable the origin (via Terraform + Flux)
# Or use the Cloudflare API directly for emergency:
curl -X PATCH "https://api.cloudflare.com/client/v4/user/load_balancers/pools/$POOL_ID" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"origins":[{"name":"us-east-1-lb","address":"...","enabled":false}]}'
```

## Best Practices

- Use latency-based or geo-based routing so users always hit the nearest region.
- Keep base application manifests identical across regions — only environment-specific values differ.
- Test a regional failure quarterly by temporarily disabling a region in your load balancer.
- Use distributed databases (CockroachDB, Spanner) rather than replicating single-region databases.
- Monitor cross-region replication lag and alert if it exceeds your RPO threshold.
- Ensure all regions deploy from the same Git commit before declaring a deployment complete.

## Conclusion

Active-active multi-region architecture with Flux CD provides both resilience and global performance. Flux's GitOps model ensures every region always runs the same intended configuration, with region-specific tuning handled cleanly through Kustomize overlays. The combination of Flux's reconciliation loop and global load balancing with health checks creates a system that degrades gracefully under regional failure rather than experiencing complete outages.
