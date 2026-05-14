# Validation Summary: How to Deploy Kubecost for Cost Management with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization custom resources
- Kubecost self-hosted 2.x
- Kubernetes manifests
- Helm chart values
- AWS cloud billing integration
- Kubecost alerts
- Kubecost Allocation and Savings APIs

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubecost Helm chart repository and values: https://kubecost.github.io/kubecost/ and https://github.com/kubecost/cost-analyzer-helm-chart
- Kubecost alerts documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=ui-alerts
- Kubecost AWS cloud billing integration documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=integrations-aws-cloud-billing-integration
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- Kubecost Container Request Right Sizing Recommendation API v2 documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api-v2

## Issues Found
- The Kubecost values used `costAnalyzer.resources`, which is not the current chart value for the cost-model container. Changed it to `kubecostModel.resources`.
- The values file included `savings.enabled`, which is not a supported Kubecost Helm value. Removed it.
- The cloud integration Secret was created but not referenced by the Helm values. Added `kubecostProductConfigs.cloudIntegrationSecret: "cloud-integration"` to the values ConfigMap.
- The AWS `cloud-integration.json` shape used a nested `aws.athena` object with non-current field names. Updated it to the documented AWS array format with `athenaBucketName`, `athenaRegion`, `athenaDatabase`, `athenaTable`, `athenaWorkgroup`, and `projectID`.
- The alert example created an arbitrary `kubecost-alerts` ConfigMap that Kubecost would not consume. Changed the example to configure alerts under `global.notifications.alertConfigs` in Helm values.
- The efficiency alert used a generic `threshold` field and a `48h` window. Changed it to the documented `efficiencyThreshold` and `spendThreshold` fields and a valid `24h` window.
- The Allocation API example used `curl -d` without `-G`, which would send a POST-style request body rather than a GET query. Added `-G`.
- The savings recommendation example used the deprecated `requestSizing` endpoint. Updated it to `requestSizingV2` and added `-G`.

## Review Notes
- The post intentionally targets Kubecost 2.x by using the `cost-analyzer` chart and repository. Kubecost 3.x uses the newer `kubecost` chart and has a higher Kubernetes support baseline, so a future article should call out the 2.x scope explicitly or update the deployment path for 3.x.
