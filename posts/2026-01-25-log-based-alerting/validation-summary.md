# Validation Summary: How to Implement Log-Based Alerting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- JavaScript Fetch API
- Slack incoming webhooks
- PagerDuty Events API v2
- Log-based alerting and anomaly detection patterns

## Sources Consulted
- TypeScript Handbook, Indexed Access Types: https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
- TypeScript Handbook, Everyday Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- MDN, Using the Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- Slack Developer Docs, Sending messages using incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- PagerDuty Developer Docs, Sending an Alert Event: https://developer.pagerduty.com/docs/send-alert-event
- PagerDuty Developer Docs, Events API v2 Overview: https://developer.pagerduty.com/docs/events-api-v2-overview

## Issues Found
1. The TypeScript snippets used `LogEntry` but did not define its shape. Added a `LogEntry` interface with timestamp, level, message, service, and typed attributes so the examples have the required data contract.
2. The grouping code used `log[key]` with an arbitrary string key. In TypeScript this is unsafe unless the object has an index signature or the key is narrowed to known properties. Replaced it with `getGroupValue`, which checks attributes first and then handles known top-level log fields explicitly.
3. The slow query threshold comment said `> 5000ms`, but the regular expression also matches exactly `5000`. Changed the comment to `>= 5000ms` to match the code.
4. The anomaly detection pipeline recorded the current value before checking anomalies and sudden changes. That made sudden-change detection compare the current value to itself. Moved `recordValue` after the checks so the current interval is compared against existing history.
5. The anomaly severity logic only treated large positive z-scores as high severity. Changed it to use `Math.abs(anomaly.zscore)` so large negative anomalies are handled consistently with the detector's absolute z-score rule.
6. The PagerDuty `dedup_key` could include `undefined` when optional alert fields were omitted. Added fallbacks to use the rule name and `global`, preserving a stable deduplication key for generic alerts.

## Review Notes
The examples are technically valid as illustrative in-memory implementations. A production implementation would usually add durable state, explicit delivery retry/backoff behavior, response-status checks after webhook calls, clock/window handling for out-of-order logs, and tracking for event types that drop to zero between aggregation intervals.
