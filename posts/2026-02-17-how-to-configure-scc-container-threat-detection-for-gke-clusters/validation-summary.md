# Validation Summary: How to Configure SCC Container Threat Detection for GKE Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Security Command Center
- Container Threat Detection
- Google Kubernetes Engine
- Google Cloud CLI
- Terraform Google provider
- Kubernetes NetworkPolicy
- Pub/Sub notifications
- Cloud Functions Python

## Sources Consulted
- Google Cloud Security Command Center: Container Threat Detection overview: https://docs.cloud.google.com/security-command-center/docs/concepts-container-threat-detection-overview
- Google Cloud Security Command Center: Use Container Threat Detection: https://docs.cloud.google.com/security-command-center/docs/how-to-use-container-threat-detection
- Google Cloud Security Command Center: Test Container Threat Detection: https://docs.cloud.google.com/security-command-center/docs/how-to-test-container-threat-detection
- Google Cloud CLI reference: `gcloud scc manage services update`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/manage/services/update
- Google Cloud CLI reference: `gcloud alpha scc settings services modules`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/scc/settings/services/modules
- Google Cloud CLI reference: `gcloud scc findings list`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/findings/list
- Google Cloud CLI reference: `gcloud scc notifications create`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Security Command Center notifications and filters: https://docs.cloud.google.com/security-command-center/docs/how-to-api-filter-notifications
- Security Command Center NotificationMessage API: https://docs.cloud.google.com/security-command-center/docs/reference/rest/v2/NotificationMessage
- Terraform Google provider `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster

## Issues Found
- The SCC service enablement commands used `gcloud scc settings services enable`, which is not the current documented stable command. Updated them to `gcloud scc manage services update container-threat-detection --enablement-state=ENABLED`.
- The prerequisites overstated GKE 1.24 and COS-only requirements. Updated the text to reflect supported versions vary by node image and architecture, including current Ubuntu support and the GKE Sandbox limitation.
- The pod verification command used the wrong label selector. Changed `app=container-watcher` to the documented `k8s-app=container-watcher`.
- The module listing and detector disable commands used an incorrect command shape. Replaced the listing command with `gcloud scc manage services describe ... --format="yaml(modules)"` and the detector disable example with the documented alpha module command.
- The Terraform example used a non-existent `google_scc_project_service` resource for CTD. Removed that resource and clarified that the Terraform snippet manages complementary GKE cluster settings while CTD is enabled through SCC service settings.
- The findings list command treated `CONTAINER_THREAT_DETECTION` as a source ID. Updated the post to first retrieve the Container Threat Detection source and then use the numeric `SOURCE_ID`.
- The findings output field used `Process_Binary`, but CTD examples expose `Process_Binary_Fullpath`. Updated the format and Python alert code accordingly.
- The notification filter used `source="CONTAINER_THREAT_DETECTION"`, which is not a valid SCC source filter. Updated it to filter on the finding `parent` source resource.
- The Cloud Function parsed the Pub/Sub message as if it were a finding directly. Updated it to parse the SCC `NotificationMessage` wrapper and then read the nested `finding`.
- The category examples used uppercase enum-like names. Updated them to match CTD finding category display names such as `Reverse Shell` and `Added Binary Executed`.

## Review Notes
Some detector module management commands are still documented under `gcloud alpha scc settings services modules`; the post now calls that out explicitly. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI documentation rather than local `--help` output.
