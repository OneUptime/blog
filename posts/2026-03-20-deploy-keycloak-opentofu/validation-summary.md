# Validation Summary: How to Deploy Keycloak with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Keycloak 23.0 (identity provider, Quarkus distribution)
- AWS ECS Fargate
- AWS RDS PostgreSQL 15.4
- AWS Application Load Balancer (ALB)
- AWS Secrets Manager
- `hashicorp/aws` Terraform provider
- `hashicorp/random` Terraform provider
- `mrparkers/keycloak` Terraform provider

## Sources Consulted
- Keycloak Server All Configuration: https://www.keycloak.org/server/all-config
- Keycloak 23.0.7 Release Notes / Docs: https://www.keycloak.org/docs/23.0.7/release_notes/index.html
- Keycloak Health Checks (Observability): https://www.keycloak.org/observability/health
- Keycloak Management Interface (port 9000 introduced in v25): https://www.keycloak.org/server/management-interface
- Keycloak 25.0.0 Release Announcement: https://www.keycloak.org/2024/06/keycloak-2500-released
- Keycloak Bootstrap Admin docs: https://www.keycloak.org/server/bootstrap-admin-recovery
- mrparkers/keycloak provider — `keycloak_realm` resource: https://github.com/mrparkers/terraform-provider-keycloak/blob/master/docs/resources/realm.md
- mrparkers/keycloak provider — provider config: https://github.com/mrparkers/terraform-provider-keycloak/blob/master/docs/index.md
- AWS provider `aws_db_instance`, `aws_ecs_task_definition`, `aws_ecs_service`, `aws_lb_listener_rule` documentation on the Terraform Registry
- Keycloak GitHub issue #29665 (KC_PROXY → KC_PROXY_HEADERS migration)

## Issues Found

**1. Duplicate `environment` attribute in the ECS container definition (HCL parse error).**
The original `aws_ecs_task_definition.keycloak` container map declared `environment` twice — once with the full list of `KC_*` variables, then again later as `environment = concat([{ name = "KEYCLOAK_ADMIN", value = "admin" }], # ... other env vars above)`. HCL does not allow duplicate attributes in the same map, so this would fail at parse time (and even if it parsed, the `concat()` form referenced no real list, only a placeholder comment, so it would have wiped out every other `KC_*` variable).

**Fix:** Removed the second `environment = concat(...)` block and added `{ name = "KEYCLOAK_ADMIN", value = "admin" }` as the final entry in the original `environment` list. This preserves all variables and makes the task definition valid HCL.

## Review Notes
The post is technically correct **for Keycloak 23.0**, which is the version pinned in the image tag (`quay.io/keycloak/keycloak:23.0`). Several of the configuration choices have changed in newer Keycloak releases — readers upgrading later should be aware:

- **`KC_PROXY=edge`** is valid in Keycloak 23, deprecated in 24, and removed in 26. The replacement is `KC_PROXY_HEADERS=xforwarded` together with `KC_HTTP_ENABLED=true`.
- **`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`** were renamed to `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` in Keycloak 26.
- **Health endpoint on port 8080** is correct for Keycloak 23–24. Starting with Keycloak 25, the management interface (including `/health/ready` and `/metrics`) moved to a dedicated port `9000` by default — readers upgrading would need to retarget the ECS health check or set `KC_HTTP_MANAGEMENT_HEALTH_ENABLED=false` (or use `--http-management-port`) to keep health on the main port.
- The **`mrparkers/keycloak` provider** is the legacy namespace; it has effectively migrated to `keycloak/keycloak` on the Terraform Registry. New deployments should consider the `keycloak/keycloak` source.
- Using `timestamp()` inside `final_snapshot_identifier` will produce a perpetual diff on every plan because `timestamp()` is evaluated at plan time. This is functional (the snapshot is only created on destroy) but cosmetically noisy — a fixed value or a separate `terraform_data` resource would be cleaner. Not changed because it is not technically wrong.
- The post references `aws_secretsmanager_secret.admin_password`, `aws_security_group.rds`, `aws_security_group.keycloak`, `aws_db_subnet_group.main`, `aws_ecs_cluster.main`, `aws_lb_target_group.keycloak`, `aws_lb_listener.https`, `aws_iam_role.ecs_execution`, `aws_iam_role.ecs_task`, and several `var.*` inputs that are not defined in the snippets. This is acceptable for a focused tutorial that omits boilerplate, but worth flagging that the post is not a complete drop-in module.
