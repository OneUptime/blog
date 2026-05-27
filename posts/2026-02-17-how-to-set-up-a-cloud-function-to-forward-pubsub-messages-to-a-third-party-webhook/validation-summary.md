# Validation Summary: Set Up a Cloud Function to Forward Pub/Sub Messages to a Third-Party Webhook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Run functions / Cloud Functions Gen 2
- Google Cloud SDK `gcloud functions deploy`
- Node.js
- Functions Framework for Node.js
- Axios
- Slack incoming webhooks
- PagerDuty Events API v2
- Microsoft Teams incoming webhooks
- HMAC request signing

## Sources Consulted
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Pub/Sub publish message overview: https://docs.cloud.google.com/pubsub/docs/publish-message-overview
- Google Cloud Run functions local Pub/Sub CloudEvent example: https://docs.cloud.google.com/functions/docs/running/direct
- Google Cloud Run functions retry policy documentation: https://docs.cloud.google.com/run/docs/tips/function-retries
- Google Cloud Pub/Sub dead-letter topic documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Slack incoming webhook documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- PagerDuty event management documentation: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration

## Issues Found
- The architecture implied messages would go to a dead-letter topic on failure, but Pub/Sub dead-letter topics must be configured on the subscription and are not created by the shown `--trigger-topic` deployments. Updated the diagram label and explanation to make this conditional and explicit.
- The deployment commands described retry behavior in the post but did not enable event-driven function retries. Added `--retry` to the Gen 2 deployment commands so failed function invocations are retried.
- The publishing example used CommonJS `require()` with top-level `await`, which is not valid as a plain CommonJS script. Wrapped the usage example in an async `main()` function.
- The request-signing section named GitHub and Stripe as examples of webhook endpoints verifying these outbound requests, but their documented webhook signatures are for events they send to consumers. Reworded the section to refer to custom webhook endpoints.

## Review Notes
- `gcloud` was not installed in the local workspace, so command verification was performed against the official Google Cloud SDK reference instead of local `--help` output.
- Each JavaScript snippet was checked individually with `node --check`.
- Microsoft Teams incoming webhook support is documented, but Microsoft currently emphasizes Workflows and Adaptive Cards for newer implementations.
