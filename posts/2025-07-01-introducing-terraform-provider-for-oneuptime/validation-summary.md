# Validation Summary: Introducing the OneUptime Terraform Provider: Infrastructure as Code

## Status
validated

## Post Type
Product announcement / Getting-started guide (contains Terraform, Bash, and CI/CD configuration examples)

## Technologies Covered
- Terraform (HCL provider configuration and resources)
- OneUptime Terraform provider (`oneuptime/oneuptime`)
- Terraform CLI (`terraform init/plan/apply/import`)
- GitHub Actions (CI/CD example)

## Sources Consulted
- OneUptime Terraform provider source — provider schema: https://github.com/oneuptime/terraform-provider-oneuptime/blob/master/internal/provider/provider.go (confirms `oneuptime_url` and `api_key` are the provider attributes; `oneuptime_url` is optional and defaults to `oneuptime.com`, with `/api` appended automatically)
- Monitor resource schema: https://github.com/oneuptime/terraform-provider-oneuptime/blob/master/internal/provider/resource_monitor.go (confirms `name` and `monitor_type` are required, `description` optional)
- Status page resource schema: https://github.com/oneuptime/terraform-provider-oneuptime/blob/master/internal/provider/resource_status_page.go (confirms `name` required, `description` optional, ImportState supported)
- Monitor type enum: OneUptime monorepo `Common/Types/Monitor/MonitorType.ts` (confirms `"Manual"` is a valid `monitor_type` value)
- Terraform Registry API: https://registry.terraform.io/v1/providers/oneuptime/oneuptime (confirms the provider is published as a community provider with source repo `github.com/OneUptime/terraform-provider-oneuptime`)
- Repository examples directory: https://github.com/oneuptime/terraform-provider-oneuptime/tree/master/examples (confirms default branch is `master`, not `main`)

## Issues Found
- **Broken example-configurations link**: The "Get Started Today" section linked to `https://github.com/oneuptime/terraform-provider-oneuptime/tree/main/examples`, but the repository's default branch is `master` and a `main` branch does not exist (the URL returns HTTP 404). Changed `tree/main/examples` to `tree/master/examples` so the link resolves.

## Review Notes
- The provider block (`oneuptime_url`, `api_key`), the `oneuptime_monitor` resource (`name`, `description`, `monitor_type = "Manual"`), and the `oneuptime_status_page` resource (`name`, `description`) all match the current provider schema and are valid. `monitor_type = "Manual"` is a real enum value.
- Supplying `oneuptime_url = "https://oneuptime.com"` is fine — the provider accepts a full URL (default is `oneuptime.com`) and appends `/api` itself, so no change was needed.
- The `terraform import` and GitHub Actions snippets are syntactically correct and use current CLI/syntax.
- Version caveat (left unchanged): the example pins `version = "1.0.0"`, which matches the official repo's own example (`examples/provider.tf`). However, the published registry releases actually start at `7.0.4508` and run through `11.0.13` (versions track the OneUptime app version), so no `1.0.0` exists. A reader copying the snippet verbatim would need to adjust the version constraint (or omit it). This was not altered because it mirrors the upstream example and pinning a current version would quickly date the post; flagged here for a future refresh.
