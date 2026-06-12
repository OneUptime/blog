# Validation Summary: How to Implement Locust Web Hooks

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Locust event hooks and statistics
- Python
- Slack incoming webhooks
- Discord webhooks
- PagerDuty Events API v2
- HTTP JSON webhooks

## Sources Consulted
- Locust Event hooks documentation: https://docs.locust.io/en/stable/extending-locust.html
- Locust API event reference: https://docs.locust.io/en/stable/api.html
- Locust changelog for request event changes: https://docs.locust.io/en/stable/changelog.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Discord webhook resource documentation: https://docs.discord.com/developers/resources/webhook
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/send-alert-event

## Issues Found
- The post listed `request_success` and `request_failure` as available Locust events and used `@events.request_failure.add_listener` in the Slack example. Locust unified these into the `request` event in 1.5 and removed the old handlers in 2.15. I updated the event overview and Slack failure listener to use `@events.request.add_listener` and check whether `exception` is set.
- The examples used `datetime.utcnow()`, which is deprecated in Python 3.12+. I changed those calls to `datetime.now(timezone.utc)` and updated the relevant imports.
- The progress reporter counted users via `environment.runner.user_greenlets`, which is an internal implementation detail. I changed it to use the documented `environment.runner.user_count` property.

## Review Notes
The examples are syntactically valid Python after the changes. The production queue example is still an in-process demonstration; for stronger delivery guarantees, a real external broker or durable queue would be needed.
