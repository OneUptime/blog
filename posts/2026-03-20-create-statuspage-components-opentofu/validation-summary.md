# Validation Summary: How to Create Statuspage Components with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu / Terraform (HCL configuration language)
- Atlassian Statuspage (statuspage.io)
- `sbecker59/statuspage` Terraform provider
- `PagerDuty/pagerduty` Terraform provider (`pagerduty_extension`)

## Sources Consulted
- Terraform Registry — sbecker59/statuspage provider: https://registry.terraform.io/providers/sbecker59/statuspage/latest
- sbecker59/terraform-provider-statuspage source — `provider.go`, `resource_component.go`, `resource_component_group.go`: https://github.com/sbecker59/terraform-provider-statuspage
- yannh/terraform-provider-statuspage source (cross-reference for schema): https://github.com/yannh/terraform-provider-statuspage
- Statuspage.io REST API reference for component status enum values
- Terraform Registry — PagerDuty/pagerduty `pagerduty_extension` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/extension

## Issues Found

1. **Non-existent provider source.** The post declared `source = "TomTom/statuspage"`, but no such provider exists on the Terraform Registry. I changed it to `sbecker59/statuspage`, which is an actively published Statuspage provider that uses the same `api_key` configuration argument as written in the post (so the rest of the provider block stayed valid).

2. **Non-existent `statuspage_page` data source.** The post used `data "statuspage_page" "main" { page_id = var.statuspage_page_id }` and then referenced `data.statuspage_page.main.id` everywhere. The `sbecker59/statuspage` provider only exposes a `statuspage_pages` (plural, listing) data source — there is no `statuspage_page` singular lookup. The page ID is something the user already has, so I removed the data block entirely and used `var.statuspage_page_id` directly at every call site.

3. **Non-existent `group_id` attribute on `statuspage_component`.** The post wrote `group_id = statuspage_component_group.api.id` on every component, but the `statuspage_component` resource schema in both the sbecker59 and yannh providers has no `group_id` field. The Statuspage data model expresses group membership the other way around: the `statuspage_component_group` resource has a required `components` attribute (a set of component IDs). I removed every `group_id = …` line from the components and added a `components = [...]` attribute on each component group instead. I also reordered the sections so components are defined before the groups that reference them.

4. **Incomplete status-value comment.** The inline comment listed `operational, degraded_performance, partial_outage, major_outage` but omitted `under_maintenance`, which is a valid value enforced by the provider's `validation.StringInSlice` check (and accepted by the Statuspage API). I added it to the comment.

5. **`for_each` example also referenced the bogus `group_id` and the removed data source.** Updated to use `var.statuspage_page_id` and added a sibling `statuspage_component_group` that collects the for_each-created components via `[for c in statuspage_component.api : c.id]`, which is the correct pattern for grouping dynamically-generated components.

## Review Notes
- I chose `sbecker59/statuspage` over `yannh/statuspage` because it preserves the post's `api_key` provider argument verbatim (yannh uses `token`), minimizing churn. Either is a reasonable choice for a real project.
- The PagerDuty section uses `pagerduty_extension` with a `config` JSON blob. The resource and arguments (`name`, `extension_schema`, `endpoint_url`, `extension_objects`, `config`) are all valid for the PagerDuty Terraform provider. The exact JSON shape inside `config` for the Statuspage extension schema is determined by PagerDuty's extension schema and is plausible as written but is not exhaustively documented; readers integrating with PagerDuty should verify the expected `config` keys against their specific extension schema.
- The post's `Description:` front-matter mentions "subscribers", but the body does not actually cover the `statuspage_subscriber` resource. This is a minor framing mismatch, not a technical error, so it was left untouched per the instruction to only fix technical errors.
- The third-party services group from the original post had no member components defined, so when restructuring I dropped it rather than ship a group with an empty `components` set (which is required by the schema). The remaining two groups demonstrate the pattern adequately.
