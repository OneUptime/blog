# Validation Summary: How to Build a Progressive Delivery Pipeline for GKE Using Cloud Deploy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Google Kubernetes Engine
- Skaffold
- Kubernetes Deployments, Services, and Jobs
- Google Cloud CLI
- Cloud Monitoring Python client
- Python

## Sources Consulted
- Google Cloud Deploy configuration schema: https://docs.cloud.google.com/deploy/docs/config-files
- Cloud Deploy GKE canary deployments with service networking: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/gke/service-networking
- Cloud Deploy deployment verification: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Cloud Deploy rollout management: https://docs.cloud.google.com/deploy/docs/deployment-strategies/manage-rollout
- Cloud Deploy CI integration and image replacement: https://docs.cloud.google.com/deploy/docs/integrating-ci
- Google Cloud SDK `gcloud deploy releases create`: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK `gcloud deploy releases promote`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/promote
- Google Cloud SDK `gcloud deploy rollouts`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts
- Google Cloud SDK `gcloud deploy targets rollback`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/targets/rollback
- Skaffold raw YAML renderer documentation: https://skaffold.dev/docs/renderers/rawyaml/
- Skaffold deployer documentation: https://skaffold.dev/docs/deployers/
- Cloud Monitoring Python `Aggregation` reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.Aggregation
- Kubernetes workload and service concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said failed metrics would automatically roll back the deployment. Cloud Deploy verification failure fails or halts the rollout; rollback is a separate target rollback action. Updated the wording to say the rollout fails and can then be fixed forward or rolled back.
- The post described creating a Kubernetes Job manifest for verification. Cloud Deploy deployment verification is configured through the `verify` stanza in `skaffold.yaml`, and Cloud Deploy runs `skaffold verify`. Replaced the standalone Job example with a Skaffold verification configuration.
- The verification example used an undocumented `deploy.cloud.google.com/canary-percentage` pod annotation. Removed that field and used documented Skaffold verification container environment configuration instead.
- The Cloud Monitoring filter compared `resource.labels.container_name` with the Kubernetes Service name. Added `CONTAINER_NAME` and used it for the container resource label.
- The Python verifier only read `PROJECT_ID`; Cloud Deploy provides `CLOUD_DEPLOY_PROJECT_ID` in the verify execution environment. Updated the code to fall back to `CLOUD_DEPLOY_PROJECT_ID`.
- The release command used `--images=my-app=...` while the Kubernetes manifest image was `gcr.io/my-project/my-app`. Updated the image replacement key to match the unrendered manifest image.

## Review Notes
The tutorial remains a simplified example. The custom Cloud Monitoring metric names assume the application exports compatible custom metrics, and the latency query assumes a distribution metric because `ALIGN_PERCENTILE_99` is only valid for distribution-valued metrics.
