# How to Use Terraform Taint and Replace for Kubernetes Resource Recreation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Resource Management

Description: Master Terraform taint and replace commands to force recreation of Kubernetes resources when needed, handling scenarios where in-place updates aren't sufficient.

---

Sometimes Kubernetes resources need complete recreation rather than in-place updates. Terraform provides taint and replace commands to force resource recreation, useful when troubleshooting issues, clearing stuck states, or ensuring clean redeployment after configuration problems.

## Understanding Taint vs Replace

Terraform deprecated the taint command in favor of the -replace flag:

- **Taint (legacy)**: Marks a resource for recreation on next apply
- **Replace (modern)**: Immediately plans recreation of specified resources

Both approaches destroy and recreate the resource.

## Using terraform replace

Force recreation of a deployment:

```bash
# Replace a specific deployment
terraform apply -replace="kubernetes_deployment.api"

# Replace multiple resources
terraform apply -replace="kubernetes_deployment.api" -replace="kubernetes_service.api"

# Plan with replace (preview changes)
terraform plan -replace="kubernetes_deployment.worker"
```

This is useful when pods are stuck in bad states or need complete redeployment.

## Recreating StatefulSets

StatefulSets require careful replacement to avoid data loss:

```hcl
resource "kubernetes_stateful_set" "database" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    service_name = "postgres"
    replicas     = 3
    # ... configuration
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

Before replacing, backup data:

```bash
# Backup database
kubectl exec postgres-0 -n production -- pg_dump mydb > backup.sql

# Remove prevent_destroy temporarily
terraform apply

# Replace StatefulSet
terraform apply -replace="kubernetes_stateful_set.database"

# Restore data
kubectl exec postgres-0 -n production -- psql mydb < backup.sql
```

## Selective Pod Recreation

When only specific pods need recreation, use kubectl instead:

```bash
# Delete pod (deployment recreates it)
kubectl delete pod api-7d8f6c-xyz -n production

# Restart deployment (recreates all pods)
kubectl rollout restart deployment/api -n production
```

Terraform replace affects the entire deployment resource.

## Handling Stuck Resources

Resources sometimes get stuck in Terraform state:

```bash
# Remove from state without destroying
terraform state rm kubernetes_deployment.stuck

# Reimport the resource
terraform import kubernetes_deployment.stuck production/stuck

# Or replace to recreate
terraform apply -replace="kubernetes_deployment.stuck"
```

## Replacing ConfigMaps and Secrets

When ConfigMaps or Secrets update, force pod restart:

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    database_url = "postgres://new-host:5432/db"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name = "app"
    namespace = "production"
    annotations = {
      # Force recreation when config changes
      config_hash = sha256(jsonencode(kubernetes_config_map.app_config.data))
    }
  }
  # ... rest of configuration
}
```

Or manually replace:

```bash
terraform apply -replace="kubernetes_deployment.app"
```

## Replacing with Dependencies

When replacing resources with dependencies, Terraform handles order:

```bash
# Replaces service and dependent ingress
terraform apply -replace="kubernetes_service.api"
```

Terraform recreates dependents automatically.

## Partial Resource Updates

Some resource changes require recreation. Terraform detects these:

```hcl
resource "kubernetes_service" "app" {
  metadata {
    name      = "app-service"
    namespace = "production"
  }

  spec {
    type = "LoadBalancer"  # Changing this forces recreation
    
    selector = {
      app = "app"
    }

    port {
      port        = 80
      target_port = 8080
    }
  }
}
```

Changing service type from ClusterIP to LoadBalancer forces replacement automatically.

## Testing with Replace

Use replace to test recovery procedures:

```bash
# Test deployment recovery
terraform apply -replace="kubernetes_deployment.test_app"

# Verify pods come back healthy
kubectl get pods -n test

# Test StatefulSet recovery
terraform apply -replace="kubernetes_stateful_set.test_db"

# Verify ordered pod recreation
kubectl get pods -n test -w
```

This validates your resources can recover from failures.

## Automation with Replace

Integrate replace into automation:

```bash
#!/bin/bash
# recreate-deployment.sh

DEPLOYMENT=$1
NAMESPACE=$2

if [ -z "$DEPLOYMENT" ] || [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <deployment> <namespace>"
  exit 1
fi

echo "Recreating deployment $DEPLOYMENT in namespace $NAMESPACE"

terraform apply \
  -replace="kubernetes_deployment.$DEPLOYMENT" \
  -auto-approve

echo "Waiting for rollout to complete"
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE
```

Use with caution in production.

## Best Practices

1. **Backup before replacing stateful resources**
2. **Use lifecycle prevent_destroy on critical resources**
3. **Test replace operations in non-production first**
4. **Consider kubectl restart instead of terraform replace for pods**
5. **Document why manual replacement was needed**
6. **Use -target with replace to limit blast radius**

The terraform replace command provides controlled recreation of Kubernetes resources when in-place updates aren't sufficient, enabling recovery from stuck states and testing disaster recovery procedures.
