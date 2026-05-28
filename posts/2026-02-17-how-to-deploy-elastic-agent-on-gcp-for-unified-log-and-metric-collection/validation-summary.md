# Validation Summary: How to Deploy Elastic Agent on GCP for Unified Log and Metric Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Compute Engine
- Google Cloud IAM
- Google Cloud Pub/Sub and Log Router
- Elastic Agent
- Elastic Fleet and Fleet Server
- Elastic System integration
- Elastic Google Cloud Platform integration
- Kibana

## Sources Consulted
- Elastic Docs: Install Fleet-managed Elastic Agents, https://www.elastic.co/docs/reference/fleet/install-fleet-managed-elastic-agent
- Elastic Docs: Elastic Agent command reference, https://www.elastic.co/docs/reference/fleet/agent-command-reference
- Elastic Docs: Google Cloud Platform integration, https://www.elastic.co/docs/reference/integrations/gcp
- Elastic Docs: System integration, https://www.elastic.co/docs/reference/integrations/system
- Elastic Docs: Custom Logs (Filestream) integration, https://www.elastic.co/docs/reference/integrations/filestream
- Elastic downloads: Elastic Agent, https://www.elastic.co/downloads/elastic-agent
- Google Cloud SDK docs: gcloud compute instances create, https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK docs: gcloud iam service-accounts create, https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK docs: gcloud projects add-iam-policy-binding, https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK docs: gcloud iam service-accounts keys create, https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create

## Issues Found
- The post described Elastic Agent as providing automatic updates. Fleet supports centralized management and upgrades, but upgrades are not simply automatic in the way the wording implied. Changed this to "Centralized upgrades and integration management."
- The prerequisites said "version 8.x+" even though current Elastic Agent and integration compatibility is version-specific. Changed this to require an Elastic deployment compatible with the Elastic Agent version being installed.
- The Fleet Server quick-start wording described an "Elastic Cloud hosted Fleet Server." Elastic Cloud provides Fleet Server as part of the Integrations Server, so the wording was corrected.
- The examples pinned Elastic Agent 8.12.0, which is outdated. Updated the sample tarball and startup script version to 9.4.0, the current Elastic Agent download version at review time.
- The GCP integration setup said to provide a service account key or configure Workload Identity. The official Elastic GCP integration documents project ID plus Credentials File or Credentials JSON, so the wording was corrected.
- The IAM example granted Logging Viewer for Cloud Logging ingestion. Elastic's GCP integration ingests GCP logs through Cloud Logging exports to Pub/Sub, and metrics require Monitoring Viewer with Compute Viewer for Compute metadata/metrics. Replaced Logging Viewer with Compute Viewer and Pub/Sub Subscriber, and clarified the Pub/Sub export requirement.
- The troubleshooting section said enrollment tokens might expire. Elastic documents revoking enrollment tokens and using the same enrollment token for multiple agents; changed this to "not been revoked."

## Review Notes
The overall tutorial flow is technically valid for Fleet-managed Elastic Agent on Compute Engine. In a production version, the startup script should avoid storing enrollment tokens directly in instance metadata and should pin Elastic Agent to the version shown by the Fleet Add agent flow for the target Elastic deployment.
