# Validation Summary: How to Forward Atlas Trigger Events to AWS EventBridge

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas (Database Triggers, App Services)
- AWS EventBridge (Partner Event Sources, event buses, rules, targets)
- AWS Lambda (Python event handler)
- AWS CLI (`aws events` subcommands)

## Sources Consulted
- AWS CLI `aws events list-partner-event-source-accounts help` — confirmed this is a partner-only command, not for AWS customers
- AWS CLI `aws events list-partner-event-sources help` — confirmed this is also partner-only
- AWS CLI `aws events list-event-sources help` — confirmed this is the correct customer-facing command to list partner event sources
- AWS CLI `aws events create-event-bus help` — confirmed that `--name` must exactly match `--event-source-name` for partner event buses
- AWS CLI `aws events put-rule help` — confirmed event pattern syntax
- AWS EventBridge documentation on content-based filtering — confirmed `{"prefix": "value"}` syntax for prefix matching in event patterns
- MongoDB Atlas documentation on EventBridge integration — confirmed partner event source naming convention `aws.partner/mongodb.com/stitch.trigger/<trigger-id>`

## Issues Found

1. **Wrong CLI command for listing partner event sources**: The post used `aws events list-partner-event-source-accounts`, which is a command for SaaS partners (like MongoDB), not for AWS customers. Changed to `aws events list-event-sources --name-prefix "aws.partner/mongodb.com"`, which is the correct customer-facing command to list partner event sources shared with your account.

2. **Event bus name must match partner event source name**: The post used a custom name `"mongodb-atlas-events"` for the `--name` parameter in `create-event-bus`. AWS requires that partner event bus names exactly match the partner event source name. Fixed to use `"aws.partner/mongodb.com/stitch.trigger/<trigger-id>"` for the bus name in all commands (`create-event-bus`, `put-rule`, `put-targets`).

3. **Event pattern source matching was incorrect**: The post used exact string matching `"source": ["aws.partner/mongodb.com"]` in event patterns. Since the actual event source is the full partner path (e.g., `aws.partner/mongodb.com/stitch.trigger/<trigger-id>`), exact matching would never match. Changed to use EventBridge prefix matching syntax: `"source": [{"prefix": "aws.partner/mongodb.com"}]`. This fix was applied in both the rule creation command and the filtering pattern example.

4. **Invalid AWS account ID in Lambda ARN**: The placeholder ARN used a 9-digit account ID (`123456789`). AWS account IDs are always 12 digits. Changed to `123456789012`.

## Review Notes
- The Atlas UI steps reference "App Services - Triggers" which is the current correct navigation path. MongoDB renamed "Stitch" to "App Services" but the partner event source path still uses the legacy `stitch.trigger` namespace, which is accurately reflected in the post.
- The Python Lambda handler code is correct and follows the expected EventBridge event envelope structure where the MongoDB change event is nested under the `detail` key.
- The post could benefit from mentioning that EventBridge has a payload size limit of 256 KB per event, which could affect large MongoDB documents, but this is an enhancement suggestion rather than a correction.
