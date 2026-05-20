# Validation Summary: How to Send ArgoCD Notifications to NewRelic

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and annotations
- New Relic NerdGraph / change tracking
- New Relic Event API and NRDB custom events
- NRQL
- kubectl

## Sources Consulted
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscription documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD Notifications service overview and secret reference syntax: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/overview/
- New Relic API keys documentation: https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/
- New Relic Event API documentation: https://docs.newrelic.com/docs/data-apis/ingest-apis/event-api/introduction-event-api/
- New Relic change tracking with NerdGraph documentation: https://docs.newrelic.com/docs/change-tracking/config/nerdgraph/
- New Relic change tracking query documentation: https://docs.newrelic.com/docs/change-tracking/query-data/

## Issues Found
- The post used one New Relic User API key for both NerdGraph and Event API ingestion. New Relic NerdGraph requires a User key, while the Event API requires an ingest/license key. I split the secret keys into `newrelic-user-key` and `newrelic-license-key`, updated the webhook headers, and corrected the debug `curl` example.
- The post described `changeTrackingCreateDeployment` as the modern change tracking API. New Relic now documents `changeTrackingCreateDeployment` as a supported deployment marker API but recommends newer `changeTrackingCreateEvent` records for broader change tracking. I changed the wording to say the GraphQL API can record deployment markers without implying this mutation is the newest method.
- The Go template snippets for annotation lookup escaped the quotes inside `index .app.metadata.annotations`, which would break template parsing. I changed those expressions to use normal quoted string arguments inside the template action.
- The trigger expressions accessed `app.status.operationState.phase` directly. Argo CD's documentation shows optional chaining for `operationState` because it may not exist. I updated the triggers to use `app.status?.operationState?.phase`.

## Review Notes
The Event API examples use uncompressed JSON payloads for small webhook calls. New Relic recommends compressed payloads for Event API ingestion, especially at volume, but the endpoint and headers shown are otherwise correct for simple examples.
