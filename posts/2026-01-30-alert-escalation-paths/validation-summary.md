# Validation Summary: How to Create Alert Escalation Paths

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PagerDuty REST API
- PagerDuty escalation policies
- PagerDuty notification rules
- PagerDuty services and incidents
- Terraform PagerDuty provider
- Python
- Bash/curl
- YAML
- Mermaid diagrams

## Sources Consulted
- PagerDuty API schema repository: https://github.com/PagerDuty/api-schema
- PagerDuty REST API OpenAPI schema: https://github.com/PagerDuty/api-schema/blob/main/reference/REST/openapiv3.json
- PagerDuty escalation policy basics: https://support.pagerduty.com/main/docs/escalation-policies
- PagerDuty developer docs for escalation rules: https://developer.pagerduty.com/api-reference/51eff119f604e-escalation-rule
- PagerDuty developer docs for user notification rules: https://developer.pagerduty.com/api-reference/043092de7e3e1-list-a-user-s-notification-rules
- PagerDuty developer docs for incident creation: https://developer.pagerduty.com/api-reference/a7d81b0e9200f-create-an-incident
- PagerDuty Terraform provider source and docs: https://github.com/PagerDuty/terraform-provider-pagerduty
- Terraform Registry docs for `pagerduty_escalation_policy`: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- Terraform Registry docs for `pagerduty_service`: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service

## Issues Found
- PagerDuty escalation rules require a positive `escalation_delay_in_minutes`; the Terraform provider validates it as at least 1, and PagerDuty's support documentation lists minimum escalation timeouts. Changed the Python and Terraform examples that used `0` for the final escalation rule to use `15` minutes and clarified that this delay applies before the policy loops or stops.
- PagerDuty REST API requests require the `Accept: application/vnd.pagerduty+json;version=2` header. Added it to the Python and curl examples.
- PagerDuty incident creation requires a `From` header containing the email address of a valid account user. Added `PAGERDUTY_FROM_EMAIL` and the corresponding curl header to the test incident example.
- The standalone Python notification-rule snippet used `requests` and `json` without importing them. Added the missing imports.

## Review Notes
The timeout values and escalation-depth targets are operational recommendations rather than universal requirements; teams should tune them to service severity, staffing model, and on-call policy. The Terraform service example uses `alert_creation`, which the current provider documentation marks as deprecated because PagerDuty is migrating services to alerts and incidents, but the value shown remains accepted by the provider.
