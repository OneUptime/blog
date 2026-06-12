# Validation Summary: How to Build Alert Notification Channels

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- TypeScript
- Slack Web API, Block Kit, message formatting, and incoming webhooks
- PagerDuty Events API v2
- Alert routing, notification dispatch, fallback channels, rate limiting, and channel health checks
- JavaScript `Intl.DateTimeFormat`

## Sources Consulted
- Slack `chat.postMessage` method: https://docs.slack.dev/reference/methods/chat.postMessage/
- Slack Block Kit button element: https://docs.slack.dev/reference/block-kit/block-elements/button-element/
- Slack message formatting and date formatting: https://docs.slack.dev/messaging/formatting-message-text/
- Slack incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- PagerDuty Events API v2 send alert event: https://developer.pagerduty.com/docs/send-alert-event
- PagerDuty Events API v2 endpoint reference: https://developer.pagerduty.com/api-reference/b3A6Mjc0ODI2Nw-send-an-event-to-pager-duty
- TypeScript 4.4 release notes for catch variable typing: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- MDN `Intl.DateTimeFormat`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- OneUptime website: https://oneuptime.com/

## Issues Found
- The router example sent notifications directly, while the complete integration example expected routing to return channel names and then dispatch separately. Changed `AlertRouter.route()` to return selected channels to avoid duplicate sends.
- The schedule example included a `timezone` field but evaluated active hours and days in UTC. Updated the schedule check to use `Intl.DateTimeFormat` with the configured time zone.
- `RoutingRule` required `name` and `enabled`, but the complete integration example omitted them. Made those fields optional and treated rules as enabled unless explicitly set to `false`.
- `RuleCondition.field` included `labels` but the implementation supported `labels.<key>`. Updated the type to match the implementation.
- Several TypeScript snippets accessed `error.message` in `catch` blocks without typing the catch variable. Updated the snippets to avoid strict TypeScript catch-variable errors.
- The Slack example computed a `severityColor` value but never used it, and Block Kit blocks do not support that field directly. Removed the unused variable.
- The Slack example called helper methods that were not shown. Added compact `postMessage()` and retry-classification helpers.
- The Slack webhook path implied `channel`, `username`, and `icon_emoji` could be overridden by incoming webhooks. Adjusted the webhook payload to omit those fields because Slack app incoming webhooks inherit them from app configuration.
- The email example called an undeclared email client and `recordSent()` helper. Added constructor injection for the email client and a `recordSent()` implementation.
- The fallback dispatcher examples called `registerChannel()` and `setFallbackConfig()` methods that were not defined. Added both methods.
- The channel validator stored channels internally but had no registration method. Added `registerChannel()`.
- The health monitor called `this.emergencyNotify()` even though the article uses `emergencyNotify()` as the shared emergency path elsewhere. Updated it for consistency.
- The complete integration example passed possibly undefined environment variables into string fields and omitted required email templates. Added non-null assertions and email templates.
- `recordFailure()` expected a string error but could receive `undefined` from a dispatch result. Added a default failure message.

## Review Notes
The examples are still illustrative and assume shared project types such as `Alert`, `NotificationChannel`, `NotificationResult`, and service setup helpers exist elsewhere. The PagerDuty Events API v2 endpoint, dedup key usage, event actions, and severity mapping are consistent with PagerDuty documentation. Slack Block Kit buttons, date formatting, threaded replies, and `chat.postMessage` fields are consistent with Slack documentation, with the webhook override limitation now reflected.
