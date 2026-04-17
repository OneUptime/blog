# Validation Summary: How to Implement Zero Trust Network with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- OpenTofu / Terraform (hashicorp/google provider)
- Identity-Aware Proxy (IAP)
- BeyondCorp Enterprise
- Access Context Manager (access levels, device policy)
- VPC Service Controls (service perimeter)
- Cloud Armor (security policies, WAF, geo-restriction)

## Sources Consulted
- hashicorp/google provider — `google_access_context_manager_service_perimeter`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_service_perimeter
- hashicorp/google provider — `google_access_context_manager_access_level`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- hashicorp/google provider — `google_compute_security_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- hashicorp/google provider — `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- hashicorp/google provider — `google_iap_web_backend_service_iam_binding`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_web_backend_service_iam
- Google Cloud Armor WAF rules: https://cloud.google.com/armor/docs/waf-rules

## Issues Found
1. **VPC Service Controls perimeter used `spec` with `use_explicit_dry_run_spec = false`** — the `spec` block is for dry-run configuration and, when used, requires `use_explicit_dry_run_spec = true`. For an enforced perimeter (the intent of the post), the `status` block is the correct choice. Changed `spec { ... }` to `status { ... }` and removed the redundant `use_explicit_dry_run_spec = false` line in `google_access_context_manager_service_perimeter.sensitive`.
2. **Default Cloud Armor rule comment contradicted its action** — the rule at priority 2147483647 was commented `# Default deny` but had `action = "allow"`. Cloud Armor requires a default rule at priority 2147483647 matching `*`, and `allow` is a valid default. Updated the comment to `# Default rule (required at priority 2147483647)` so it accurately describes the action.

## Review Notes
- The post's `xss-v33-stable` preconfigured WAF rule is valid (CRS 3.3), but Google now recommends CRS 4.22 (`xss-v422-stable`) for new deployments. Not changed since CRS 3.3 is still supported.
- `google_iap_brand` only allows one brand per project and requires a Google Workspace / Cloud Identity support email — the example uses `iap-admin@example.com` which is fine for illustration.
- Code snippets reference `google_compute_instance_group_manager.app` and `google_access_context_manager_access_policy.policy` without defining them. These are assumed prerequisites and typical of tutorial-style brevity; left as-is.
- `DESKTOP_CHROME_OS` with `minimum_version = "91.0.0"` is accepted by Access Context Manager; the specific version is a reasonable example.
