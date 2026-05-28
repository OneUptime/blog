# Validation Summary: How to Integrate Security Command Center with SIEM Tools via Pub/Sub

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Google Cloud Security Command Center
- Google Cloud Pub/Sub
- Google Cloud CLI
- Cloud Monitoring alert policies
- Splunk
- Google Security Operations / Chronicle
- Microsoft Sentinel
- Azure Logic Apps
- Python Cloud Functions

## Sources Consulted
- Google Cloud Security Command Center Pub/Sub notifications documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-notifications
- Google Cloud SDK `gcloud scc notifications create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud Pub/Sub subscription properties documentation: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Security Command Center Splunk integration documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-configure-scc-splunk
- Google Security Operations forwarder configuration documentation: https://docs.cloud.google.com/chronicle/docs/install/forwarder-management-configurations
- Google Security Operations supported parsers/log types documentation: https://docs.cloud.google.com/chronicle/docs/ingestion/parser-list/supported-default-parsers
- Microsoft Sentinel GCP Pub/Sub and Security Command Center connector documentation: https://learn.microsoft.com/en-us/azure/sentinel/connect-google-cloud-platform

## Issues Found
- The SCC notification publisher service account was incorrect. Replaced the old `service-org-${ORG_ID}@security-center-api.iam.gserviceaccount.com` identity with the current SCC notification service agent, `service-org-${ORG_ID}@gcp-sa-scc-notification.iam.gserviceaccount.com`, and changed the role to `roles/securitycenter.notificationServiceAgent`.
- The post implied that manual Pub/Sub publisher binding is always required. Updated the text to explain that SCC creates the notification service agent and grants the required topic role automatically when the notification config creator can update the topic IAM policy.
- The Chronicle forwarder YAML used an unverified/incorrect shape and log type, and the forwarder is now deprecated for new customers. Replaced it with current guidance to configure a Pub/Sub collector through Google SecOps and noted the forwarder phase-out.
- The Microsoft Sentinel Logic App example used Azure Managed Identity directly against the Google Pub/Sub API, which would not authenticate to Google APIs by itself. Updated the example to use a Google OAuth bearer token variable and added the need for workload identity federation or service account token exchange.
- The Cloud Monitoring alert command used non-existent `gcloud monitoring policies create` flags, `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with the documented `--if='> 1000'` and `--duration=300s` flags.

## Review Notes
The GCP CLI was not installed in the local environment, so CLI verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output. The Splunk stanza remains illustrative because Splunk deployment details vary by add-on version and environment; the surrounding claim that SCC data can be sent to Splunk is supported by Google Cloud's SCC Splunk integration documentation.
