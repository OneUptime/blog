# Validation Summary: How to Configure App Engine Ingress Controls to Accept Only Internal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine
- App Engine ingress controls
- Google Cloud Load Balancing
- Serverless network endpoint groups
- Cloud Tasks
- Cloud Scheduler and App Engine cron
- App Engine firewall
- Google Cloud Armor
- Google Cloud CLI

## Sources Consulted
- Google Cloud App Engine ingress settings: https://docs.cloud.google.com/appengine/docs/standard/ingress-settings
- Google Cloud SDK `gcloud app services update` reference: https://cloud.google.com/sdk/gcloud/reference/app/services/update
- Google Cloud Load Balancing guide for global external Application Load Balancers with serverless NEGs: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud SDK `gcloud compute network-endpoint-groups create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud App Engine firewall documentation: https://docs.cloud.google.com/appengine/docs/standard/understanding-firewalls
- Google Cloud Tasks App Engine handlers documentation: https://docs.cloud.google.com/tasks/docs/creating-appengine-handlers
- Google Cloud Pub/Sub push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud SDK `gcloud scheduler jobs create app-engine` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/app-engine

## Issues Found
- The post defined internal App Engine ingress too broadly as same-project Google Cloud traffic and included Pub/Sub push subscriptions. Updated the explanation to match Google Cloud's current definition: same-project VPC resources, Serverless VPC Access, specific Shared VPC host-project cases, and VPC-connector-routed serverless callers.
- The internal traffic list incorrectly included same-project App Engine and Cloud Run traffic without the VPC connector requirement. Added the connector and egress routing condition.
- Pub/Sub push subscriptions were listed as internal traffic. Moved them to external traffic because Pub/Sub push delivery uses publicly addressable HTTPS endpoints.
- The load balancer forwarding-rule example omitted `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM`, which are part of the current global external Application Load Balancer setup. Added both flags.
- The common architecture section said the frontend could call the API using internal App Engine URLs without mentioning VPC connector routing. Updated it to include VPC-routed egress.
- The firewall section described a strict ingress-then-firewall evaluation order and suggested using App Engine firewall rules for load-balancer client IP filtering. Reworded it to avoid unsupported ordering claims and to reflect Google's recommendation to leave the default App Engine firewall rule as `allow` with `internal-and-cloud-load-balancing`, using Cloud Armor for client-facing filtering.
- The troubleshooting section claimed ingress changes have no propagation delay. Removed the unsupported timing claim and replaced it with a retest instruction.

## Review Notes
The local environment did not have `gcloud` available, so CLI validation was performed against official Google Cloud SDK reference documentation instead of local `--help` output.
