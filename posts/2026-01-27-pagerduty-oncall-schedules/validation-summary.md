# Validation Summary: How to Configure PagerDuty On-Call Schedules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PagerDuty schedules and schedule layers
- PagerDuty REST API v2
- PagerDuty escalation policies
- PagerDuty schedule overrides
- PagerDuty `pd` CLI
- Terraform PagerDuty provider
- Python `requests`
- Slack workflow automation concepts

## Sources Consulted
- PagerDuty API schema repository: https://github.com/PagerDuty/api-schema
- PagerDuty REST API OpenAPI schema: https://raw.githubusercontent.com/PagerDuty/api-schema/main/reference/REST/openapiv3.json
- PagerDuty Create a Schedule API reference: https://developer.pagerduty.com/api-reference/9fd73d80ad5f7-create-a-schedule
- PagerDuty Create one or more overrides API reference: https://developer.pagerduty.com/api-reference/41d0a7c3c3a01-create-one-or-more-overrides
- PagerDuty List all on-calls API reference: https://developer.pagerduty.com/api-reference/3a6b910f11050-list-all-of-the-on-calls
- PagerDuty Edit Schedules documentation: https://support.pagerduty.com/main/docs/edit-schedules
- PagerDuty Escalation Policy Basics: https://support.pagerduty.com/main/docs/escalation-policies
- Terraform PagerDuty provider `pagerduty_schedule` documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/schedule
- Terraform PagerDuty provider `pagerduty_escalation_policy` documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- Community `pd` CLI schedule command documentation: https://github.com/martindstone/pagerduty-cli/blob/master/docs/schedule.md

## Issues Found
- The schedule layer YAML used `layers` and bare user IDs, which do not match the PagerDuty REST API schema. Updated it to `schedule_layers`, added `type: "schedule"`, timezone offsets, and wrapped each user as `user: { id, type: "user_reference" }`.
- The post stated that the topmost layer with an active user takes precedence and described layers as primary/backup coverage. PagerDuty computes one final schedule from layers, and overlapping lower layers mask higher layers; backup coverage should be modeled with separate schedules in escalation policies. Updated the wording and examples to describe coverage windows instead.
- The rotation snippets used generic fields such as `type`, `turn_length_seconds`, `handoff_time`, and `start_day_of_week` as if they were PagerDuty schedule-layer fields. Replaced them with PagerDuty schedule-layer fields: `start`, `rotation_virtual_start`, `rotation_turn_length_seconds`, and `restrictions`.
- The handoff YAML implied PagerDuty-native overlap and notification fields. Reworded it as process configuration for team automation, not PagerDuty REST API configuration.
- The CLI example used `pd schedule override create --schedule-id --user-id`, but the documented community `pd` command is `pd schedule override add --id --user_id`. Updated the command.
- The override API example used the older singular `override` request body. PagerDuty's current schema expects `overrides`, an array of override objects; the older single-override implementation is deprecated. Updated the request payload and return description.
- The escalation policy API example omitted the required `type: "escalation_policy"` field from the schema. Added it.
- The escalation policy API comments described the first rule as immediate and later delays inconsistently. Clarified that `escalation_delay_in_minutes` is the time before escalating away from each rule if unacknowledged.
- The escalation policy API snippet used `requests` without importing it in that snippet. Added `import requests`.

## Review Notes
The Terraform snippets match the current PagerDuty provider resource shapes for schedules and escalation policies. The Slack workflow example remains pseudocode and depends on helper functions that are intentionally not implemented in the post.
