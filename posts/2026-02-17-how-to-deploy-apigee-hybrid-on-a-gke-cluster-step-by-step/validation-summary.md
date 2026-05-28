# Validation Summary: How to Deploy Apigee Hybrid on a GKE Cluster Step by Step

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apigee Hybrid
- Google Kubernetes Engine (GKE)
- Kubernetes
- Helm
- cert-manager
- Google Cloud IAM service accounts
- Google Cloud CLI

## Sources Consulted
- Google Cloud Apigee Hybrid supported platforms and versions: https://docs.cloud.google.com/apigee/docs/hybrid/supported-platforms
- Google Cloud Apigee Hybrid v1.16 API enablement: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/precog-enableapi
- Google Cloud Apigee Hybrid v1.16 GKE cluster creation guidance: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/install-create-cluster
- Google Cloud Apigee Hybrid v1.16 service account setup: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/install-service-accounts
- Google Cloud Apigee Hybrid v1.16 overrides file reference: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/install-create-overrides
- Google Cloud Apigee Hybrid v1.16 CRD installation: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/install-crds
- Google Cloud Apigee Hybrid v1.16 Helm installation: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/install-helm-charts
- Google Cloud Apigee Hybrid Helm reference: https://docs.cloud.google.com/apigee/docs/hybrid/v1.16/helm-reference
- Google Cloud apigeectl deprecation notice: https://docs.cloud.google.com/apigee/docs/deprecations/apigeectl

## Issues Found
- Replaced the deprecated and unsupported `apigeectl` v1.12 installation flow with the current Helm chart flow. Google documents `apigeectl` as unsupported for Apigee Hybrid v1.12 and later, with Helm as the supported installation method.
- Updated the Apigee Hybrid version target from `1.12.0` to `1.16.4`, which is in the current supported release line.
- Corrected the required Google APIs by adding `pubsub.googleapis.com`, which Apigee Hybrid requires for quota functionality.
- Replaced the manually assembled IAM service account script because it used incorrect and incomplete roles, including a non-current MART role and missing guardrails, runtime, and watcher accounts. The post now uses the official `create-service-account` tool.
- Corrected the overrides YAML to match current Helm-era properties, including `namespace`, `enhanceProxyLimits`, `guardrails`, `watcher`, chart-relative service account paths, `virtualhosts[].selector`, and Cassandra storage/resource settings.
- Updated the GKE cluster guidance to require a standard cluster instead of Autopilot and to use separate `apigee-data` and `apigee-runtime` node pools with production-sized nodes.
- Updated cert-manager from v1.13.0 to v1.17.2, a supported release for Apigee Hybrid v1.16.
- Replaced `apigeectl init`, `apigeectl apply`, and `apigeectl check-ready` commands with the supported CRD and Helm chart installation sequence.
- Fixed verification and DNS commands to select the Apigee ingress gateway service by the current labels.
- Updated the upgrade section to describe pulling and upgrading Helm charts instead of updating `apigeectl`.

## Review Notes
This remains a high-level deployment walkthrough. A production-ready Apigee Hybrid deployment still needs environment group setup in the Apigee management plane, synchronizer authorization, TLS certificate preparation, backup configuration, firewall review, and a full upgrade runbook tailored to the organization's exact authentication method and topology.
