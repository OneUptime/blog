# Validation Summary: How to Create PagerDuty Escalation Policies with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- PagerDuty Terraform Provider (`PagerDuty/pagerduty` ~> 3.0)
- PagerDuty resources: `pagerduty_escalation_policy`, `pagerduty_schedule`, `pagerduty_user` (data source)

## Sources Consulted
- Official PagerDuty Terraform Provider documentation for `pagerduty_escalation_policy`: https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/escalation_policy.html.markdown
- Official PagerDuty Terraform Provider documentation for `pagerduty_schedule`: https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/schedule.html.markdown
- Terraform Registry: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs

## Issues Found
No technical issues found.

All HCL code is syntactically valid and aligns with the current PagerDuty Terraform provider schema:
- `pagerduty_escalation_policy` arguments `name`, `num_loops`, nested `rule` blocks with `escalation_delay_in_minutes` and one-or-more `target` blocks are correct.
- Valid target `type` values `user_reference` and `schedule_reference` are used correctly.
- `pagerduty_schedule` `layer` block uses the correct required attributes (`start`, `rotation_virtual_start`, `rotation_turn_length_seconds`, `users`).
- `restriction` block uses the valid `weekly_restriction` type with `start_day_of_week=1` (Monday per provider convention), `start_time_of_day` in `HH:MM:SS` format, and `duration_seconds`.
- `for_each` with map-of-object variables for team-based and tiered policies is a valid Terraform pattern.
- Provider version constraint `~> 3.0` is appropriate for the current major version of the PagerDuty provider.

## Review Notes
- The "Escalation Policy with On-Call Handoff Notifications" section title is slightly misleading — the code shown configures a schedule with a weekly time-of-day restriction rather than explicit handoff notifications (which are a per-user notification rule in PagerDuty, not a schedule-level Terraform attribute). The HCL itself is valid; only the framing of the section is loose. Left unchanged because the code is technically correct.
- The "Team-Based Escalation Policies" example iterates over teams via `for_each` but does not actually set the optional `teams` attribute on `pagerduty_escalation_policy` (which can associate the policy with a PagerDuty team). That is a stylistic choice rather than a correctness issue.
