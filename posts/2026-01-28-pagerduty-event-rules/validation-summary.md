# Validation Summary: How to Implement PagerDuty Event Rules

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PagerDuty Event Orchestration
- PagerDuty legacy Rulesets and Event Rules
- PagerDuty Events API v2
- PagerDuty CLI
- Python `requests`
- Mermaid diagrams

## Sources Consulted
- PagerDuty Rulesets documentation: https://support.pagerduty.com/main/docs/rulesets
- PagerDuty Event Orchestration documentation: https://support.pagerduty.com/main/docs/event-orchestration
- PagerDuty Events API v2 overview and send event API reference: https://developer.pagerduty.com/docs/events-api-v2-overview and https://developer.pagerduty.com/api-reference/b3A6Mjc0ODI2Nw-send-an-event-to-pager-duty
- PagerDuty API tools and code samples: https://developer.pagerduty.com/docs/api-tools-and-code-samples
- PagerDuty Go client models for Events API v2 and Event Orchestration payload fields: https://github.com/PagerDuty/go-pagerduty
- PagerDuty CLI command documentation: https://github.com/martindstone/pagerduty-cli

## Issues Found
- The post described legacy PagerDuty Event Rules as if they were still managed in the web app. PagerDuty documents that Rulesets and Event Rules web pages reached end-of-life on January 31, 2025, so I updated the post to direct readers to Event Orchestration and current UI paths.
- The rule examples used non-current JSON shapes such as `condition.expression.field/op/value`, `route_to` mixed with transform actions, `suppress_until`, and nested `annotate.notes`. I replaced them with Event Orchestration-style `orchestration_path`, `sets`, `rules`, `conditions[].expression`, and documented action fields such as `route_to`, `suppress`, `severity`, `annotate`, and `priority`.
- The architecture diagrams said suppressed events were dropped. PagerDuty distinguishes suppressed alerts from dropped events, and suppressed alerts remain visible in the Alerts table. I changed the diagrams to show suppressed alerts instead.
- The service-level section pointed to **Services > Your Service > Event Rules** and used a legacy `service_rules` shape. I updated it to Service Orchestration Rules under service settings and changed the example to the current orchestration rule shape.
- The debugging command `pd event list --since ... --service-id ...` is not a documented PagerDuty CLI command. I replaced it with the documented `pd log --since "1 hour ago" --json`.
- The Python sample imported `json` unnecessarily and returned a response body without checking HTTP errors. I removed the unused import and added `response.raise_for_status()`.

## Review Notes
Validated all JSON blocks parse successfully and the Python code compiles. The article now discusses modern Event Orchestration while retaining the original Event Rules framing for readers migrating from legacy terminology.
