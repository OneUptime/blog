# Validation Summary: How to Create Opsgenie Teams and Escalations with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform)
- Opsgenie (Atlassian incident management)
- `opsgenie/opsgenie` Terraform provider (~> 0.6)
- Prometheus Alertmanager integration

## Sources Consulted
- Opsgenie Terraform provider — `opsgenie_schedule` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/schedule.html.markdown
- Opsgenie Terraform provider — `opsgenie_schedule_rotation` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/schedule_rotation.html.markdown
- Opsgenie Terraform provider — `opsgenie_escalation` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/escalation.html.markdown
- Opsgenie Terraform provider — `opsgenie_team` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/team.html.markdown
- Opsgenie Terraform provider — `opsgenie_team_routing_rule` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/team_routing_rule.html.markdown
- Opsgenie Terraform provider — `opsgenie_api_integration` docs: https://github.com/opsgenie/terraform-provider-opsgenie/blob/master/website/docs/r/api_integration.html.markdown
- Terraform Registry — opsgenie/opsgenie provider: https://registry.terraform.io/providers/opsgenie/opsgenie/latest/docs

## Issues Found
1. **Nested `rotation` block inside `opsgenie_schedule`** — The original post defined the rotation as a nested block inside the `opsgenie_schedule` resource. The provider does not support a nested rotation block; rotations are a separate `opsgenie_schedule_rotation` resource that references the schedule via `schedule_id`. Fixed by extracting the rotation into a top-level `opsgenie_schedule_rotation "backend_primary"` resource.
2. **`rule` vs `rules` in `opsgenie_escalation`** — The provider names the repeating block `rules` (plural). The post used `rule` (singular). All three rule blocks were renamed to `rules`.
3. **`condition` vs `conditions` in `opsgenie_team_routing_rule`** — Inside the `criteria` block, the nested condition block is named `conditions` (plural). The post used `condition` (singular). Fixed.
4. **Invalid `send_alert_actions` argument on `opsgenie_api_integration`** — There is no `send_alert_actions` argument in the provider schema for this resource. Removed it. Valid related arguments include `enabled`, `allow_write_access`, `ignore_responders_from_payload`, and `suppress_notifications`.

## Review Notes
- The `opsgenie_user` `role` field accepts the Opsgenie role names ("Owner", "Admin", "User", or a custom role) — the post's use of `"User"` is correct.
- The `member` block `role` field accepts only `"admin"` or `"user"` (lowercase) — the post is correct.
- The `delay` field in escalation rules is a plain integer in minutes — the post's use is correct.
- The provider version pin `~> 0.6` is reasonable; the latest 0.6.x line of the provider is current as of this review.
- Author may want to consider adding a note that `start_date` for the rotation must be in the future or near-current when first applied; an old date like `2024-01-01T09:00:00Z` will still work but the rotation calculation begins from that anchor.
