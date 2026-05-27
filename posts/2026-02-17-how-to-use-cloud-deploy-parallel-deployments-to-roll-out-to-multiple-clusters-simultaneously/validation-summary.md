# Validation Summary: How to Use Cloud Deploy Parallel Deployments to Roll Out to Multi Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Cloud Deploy parallel deployments and multi-targets
- Google Kubernetes Engine
- Cloud Run
- Skaffold
- Kubernetes manifests
- gcloud CLI

## Sources Consulted
- Google Cloud Deploy: Deploy to multiple targets at the same time: https://docs.cloud.google.com/deploy/docs/parallel
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy deploy parameters: https://docs.cloud.google.com/deploy/docs/parameters
- Google Cloud Deploy deploy parameters quickstart: https://docs.cloud.google.com/deploy/docs/deploy-app-parameters
- Google Cloud Deploy canary deployments overview: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary
- Google Cloud Deploy GKE service-networking canary deployments: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/gke/service-networking
- Google Cloud SDK: gcloud deploy apply: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/apply
- Google Cloud SDK: gcloud deploy releases create: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK: gcloud deploy releases promote: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/promote
- Google Cloud SDK: gcloud deploy rollouts list: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list

## Issues Found
- The post described child rollouts as all deploying simultaneously without qualification. Cloud Deploy deploys child rollouts at the same time only up to Cloud Build concurrency limits, so the wording was qualified in the introduction and pipeline section.
- The deploy-parameters manifest example used `replicas: $REPLICAS`, which is not Cloud Deploy's documented placeholder syntax. It was changed to `replicas: 3 # from-param: ${replicas}` to include the required default value and `from-param` directive.
- The canary section said child rollouts could be advanced independently. Cloud Deploy documentation says child rollouts cannot be advanced directly; only the controller rollout can be advanced, and Cloud Deploy advances the children. The text was corrected.

## Review Notes
The examples use `skaffold/v4beta7`, which is still shown in current Google Cloud Deploy quickstarts. The canary example is valid for GKE service-based networking and assumes the referenced Kubernetes Service and Deployment exist in the rendered manifests.
