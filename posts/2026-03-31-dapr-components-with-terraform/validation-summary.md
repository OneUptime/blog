# Validation Summary: How to Deploy Dapr Components with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (component model, state stores, pub/sub, secret stores)
- Terraform (HCL, `kubernetes_manifest` resource, variables, tfvars)
- Kubernetes (custom resources, CRDs)
- HashiCorp Kubernetes provider (`hashicorp/kubernetes` ~> 2.25)
- Redis (as Dapr state store)
- Apache Kafka (as Dapr pub/sub broker)
- HashiCorp Vault (as Dapr secret store)

## Sources Consulted
- Dapr component spec reference: https://docs.dapr.io/reference/components-reference/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kafka pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr HashiCorp Vault secret store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Terraform Kubernetes provider `kubernetes_manifest` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Kubernetes provider configuration: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs

## Issues Found
1. **Double port in Redis host variable (prod.tfvars)**: The Terraform code for the Redis state store constructs the `redisHost` value as `"${var.redis_host}:6379"`, appending port 6379 to the variable. However, the `prod.tfvars` example set `redis_host = "redis-prod.internal:6379"`, which already included the port. This would produce the invalid address `redis-prod.internal:6379:6379`. Fixed by changing the tfvars value to `redis_host = "redis-prod.internal"` (without the port suffix).

## Review Notes
- The Dapr component API version `dapr.io/v1alpha1` is current and correct. If Dapr graduates the Component CRD to `v1` in a future release, the `apiVersion` values in this post will need updating.
- The `kubernetes_manifest` resource requires the CRD to already exist on the cluster at plan time. Readers should ensure Dapr is installed (and its CRDs are registered) before running `terraform plan`. The post could mention this prerequisite in a future update.
- All Dapr component metadata field names (`redisHost`, `redisPassword`, `brokers`, `authType`, `initialOffset`, `vaultAddr`, `vaultToken`, `actorStateStore`) and `secretKeyRef` usage are correct per current Dapr documentation.
- The `kubectl get components` command works correctly when Dapr CRDs are installed, as `components` is a recognized shorthand for `components.dapr.io`.
