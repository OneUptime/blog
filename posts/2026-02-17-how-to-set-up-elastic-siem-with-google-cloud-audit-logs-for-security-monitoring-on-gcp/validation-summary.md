# Validation Summary: How to Set Up Elastic SIEM with Google Cloud Audit Logs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging log sinks
- Google Cloud Pub/Sub
- Google Cloud IAM service accounts
- Elastic Agent
- Elastic Google Cloud Platform integration
- Elastic Security detection rules
- Kibana Discover and dashboards
- Elasticsearch index lifecycle management

## Sources Consulted
- Google Cloud Audit Logs best practices: https://cloud.google.com/logging/docs/audit/best-practices
- Google Cloud Data Access audit log configuration: https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud audit log names and Policy Denied log type: https://cloud.google.com/resource-manager/docs/audit-logging
- Google Cloud `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Elastic Google Cloud Platform integration documentation: https://www.elastic.co/docs/reference/integrations/gcp
- Elastic GCP audit integration exported fields: https://www.elastic.co/docs/reference/integrations/gcp/audit
- Elastic Security detection rule API documentation: https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createrule
- Elasticsearch searchable snapshot ILM action documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-searchable-snapshot.html

## Issues Found
- The post stated that GCP generates three audit log types. Google Cloud documents four audit log types: Admin Activity, Data Access, System Event, and Policy Denied. I updated the explanation and added a Policy Denied sink using `cloudaudit.googleapis.com%2Fpolicy`.
- The post implied Data Access audit logs are always recorded. Google Cloud disables Data Access audit logs by default for most services, so I added the required enablement caveat.
- The Elastic GCP integration snippet placed project credentials under stream-level variables. Current Elastic GCP integration documentation treats project ID and credentials as integration-level settings and the audit Pub/Sub topic/subscription as audit stream settings. I rewrote the snippet as key settings instead of an inaccurate raw policy structure.
- The detection rule action example omitted the required connector `id` and action `group`. I added placeholders consistent with Elastic detection rule API requirements.
- The sample EQL described detecting external IP use but did not exclude all RFC1918 private ranges. I added `192.168.0.0/16` and made the EQL examples consistent.

## Review Notes
The Elastic Agent download example pins `8.12.0`, which can be appropriate for an 8.x deployment but is not the current integration baseline shown in Elastic's latest GCP integration documentation. Future updates should either align the example with the target Elastic Stack version or explicitly tell readers to download the agent version matching their Fleet/Kibana deployment.
