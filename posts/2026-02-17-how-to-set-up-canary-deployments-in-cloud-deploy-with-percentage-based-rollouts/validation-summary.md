# Validation Summary: How to Set Up Canary Deployments in Cloud Deploy with Percentage-Based Rollouts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Google Kubernetes Engine
- Kubernetes Deployment and Service resources
- Kubernetes Gateway API and HTTPRoute
- Google Cloud CLI
- Skaffold-based Cloud Deploy releases

## Sources Consulted
- Google Cloud Deploy: Use a canary deployment strategy: https://cloud.google.com/deploy/docs/deployment-strategies/canary
- Google Cloud Deploy: Canary Deployments to GKE and GKE attached clusters using service-based networking: https://cloud.google.com/deploy/docs/deployment-strategies/canary/gke/service-networking
- Google Cloud Deploy: Canary Deployments to GKE and GKE attached clusters using Gateway API networking: https://cloud.google.com/deploy/docs/deployment-strategies/canary/gke/gateway-api
- Google Cloud Deploy configuration schema reference: https://cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy canary quickstart: https://cloud.google.com/deploy/docs/deploy-app-canary
- Google Cloud SDK reference for `gcloud deploy releases create`: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK reference for `gcloud deploy rollouts advance`: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/advance
- Google Cloud SDK reference for `gcloud deploy rollouts cancel`: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/cancel

## Issues Found
- The prerequisites implied that Gateway API is required for Cloud Deploy canary deployments. This is only required for Gateway API traffic splitting, not for service-based networking. Updated the prerequisite to distinguish the two GKE canary modes.
- The service-networking example said that 10 replicas with a 10% canary phase would produce 1 canary pod and 9 stable pods, but Cloud Deploy enables pod overprovisioning by default. Added `disablePodOverprovisioning: true` to the service-networking configuration and clarified that this keeps the total replica count stable by scaling the original Deployment down as the canary Deployment scales up.
- The release section implied that a first deployment would immediately start at the 10% canary phase. Cloud Deploy skips canary phases when there is no existing stable version to split against. Updated the text to state that canary execution requires an existing stable version recognized by Cloud Deploy.

## Review Notes
The Google Cloud CLI examples use valid command groups and flags. The Gateway API example uses fields documented by Cloud Deploy for `gatewayServiceMesh`; `routeUpdateWaitTime` remains optional and may be useful if HTTPRoute propagation causes dropped requests.
