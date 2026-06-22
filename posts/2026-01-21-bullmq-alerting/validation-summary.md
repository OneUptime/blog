# Validation Summary: How to Set Up Alerting for BullMQ Queues

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- BullMQ
- Node.js
- TypeScript
- Redis / ioredis
- Slack incoming webhooks
- PagerDuty Events API v2
- Nodemailer
- Generic HTTP webhooks

## Sources Consulted
- BullMQ Queue API documentation: https://api.docs.bullmq.io/classes/v4.Queue.html
- BullMQ connections guide: https://docs.bullmq.io/guide/connections
- ioredis CommonRedisOptions documentation: https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/send-alert-event
- PagerDuty Events API v2 endpoint reference: https://developer.pagerduty.com/api-reference/b3A6Mjc0ODI2Nw-send-an-event-to-pager-duty
- Nodemailer documentation: https://nodemailer.com/

## Issues Found
- The `AlertManager` snippet imported `QueueEvents` but never used it. Removed the unused import to avoid TypeScript lint/compile failures in projects with `noUnusedLocals` enabled.
- `AnomalyAlertManager` overrode `collectMetrics`, but `collectMetrics` was declared `private` in `AlertManager`. Changed it to `protected` so the subclass can legally override and call `super.collectMetrics(...)`.
- The processing-rate calculation assumed a hardcoded 30-second interval even though `start(intervalMs)` accepts any interval. Added `checkIntervalMs` tracking and changed the calculation to use the configured interval.
- Resolved alerts remained in the `alerts` map and prevented future alerts with the same queue/name from firing again. Updated the condition so resolved alerts can fire again after cooldown.
- `getAlertHistory()` returned only the current alert map values, not historical alert events. Added an `alertHistory` array and append each fired alert so the method matches its name and the complete example's usage.
- The Slack channel accepted and sent a `channel` override in the incoming webhook payload. Slack's current incoming webhook documentation says the default channel cannot be overridden, so the optional channel parameter and payload field were removed.
- The Slack webhook example did not check HTTP response status. Added a `response.ok` check consistent with the other notification channel examples.

## Review Notes
- BullMQ queue getter usage (`getWaitingCount`, `getActiveCount`, `getCompletedCount`, `getFailedCount`, `getDelayedCount`, `getWaiting`, `getCompleted`, and `isPaused`) matches the current BullMQ API.
- The `maxRetriesPerRequest: null` Redis option is valid for ioredis and is required by BullMQ for worker connections; for queue-only producer/getter connections, BullMQ notes that the default retry behavior may be preferable for request/response paths.
- The email HTML example interpolates alert data directly. In production, escape or sanitize untrusted values before sending HTML email.
