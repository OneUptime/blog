# Validation Summary: How to Choose Between Cloud Run Cloud Functions App Engine and GKE

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Run
- Cloud Run functions / Cloud Functions
- App Engine Standard and Flexible environments
- Google Kubernetes Engine (GKE)
- Kubernetes Deployments
- Python Functions Framework
- Google Cloud CLI
- Docker
- Pub/Sub

## Sources Consulted
- Cloud Run GPU support for services: https://docs.cloud.google.com/run/docs/configuring/services/gpu
- Cloud Run request timeout configuration: https://docs.cloud.google.com/run/docs/configuring/request-timeout
- Cloud Run WebSockets documentation: https://docs.cloud.google.com/run/docs/triggering/websockets
- Cloud Run gRPC documentation: https://docs.cloud.google.com/run/docs/triggering/grpc
- Cloud Run autoscaling documentation: https://docs.cloud.google.com/run/docs/about-instance-autoscaling
- Cloud Run functions quotas: https://cloud.google.com/functions/quotas
- Cloud Run functions deployment documentation: https://cloud.google.com/functions/docs/deploy
- Cloud Run function writing documentation: https://cloud.google.com/functions/docs/writing
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- App Engine environments comparison: https://docs.cloud.google.com/appengine/docs/the-appengine-environments
- App Engine `app.yaml` reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- App Engine project and application setup: https://docs.cloud.google.com/appengine/docs/standard/managing-projects-apps-billing
- App Engine Flexible WebSockets documentation: https://docs.cloud.google.com/appengine/docs/flexible/using-websockets-and-session-affinity
- GKE pricing documentation: https://cloud.google.com/kubernetes-engine/pricing
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The Cloud Functions deploy command used a deployed function name, `process-image`, that did not match the Python entry point, `process_image`. Added `--entry-point=process_image` so the command targets the actual function in the source code.
- The post said Cloud Run had no GPU support as of early 2026. Current Cloud Run documentation supports NVIDIA L4 GPUs for services in supported regions with CPU, memory, and billing constraints. Updated the Cloud Run limitation and the decision matrix.
- The decision framework implied GKE was required for all GPU workloads. Updated it to reserve GKE for advanced GPU needs beyond Cloud Run's L4 GPU support.
- The decision matrix said Cloud Functions 2nd gen supports custom containers. The Cloud Functions deployment model deploys source functions with buildpacks; custom container images are a Cloud Run service path, not a Cloud Functions deployment path. Updated the matrix to "No".
- The decision matrix listed App Engine WebSockets as generally supported. Official docs distinguish Standard and Flexible environments; WebSockets are supported in the Flexible environment. Updated the matrix to "Flexible only".
- The decision matrix said App Engine Standard costs $0 at zero traffic without caveat. App Engine Standard can scale to zero under automatic scaling, but configurations such as `min_instances: 1` keep instances running. Added that caveat.

## Review Notes
The article remains a high-level platform selection guide. Some recommendations, such as Cloud Run being the default for many new projects and GKE being a better fit for complex Kubernetes requirements, are judgment calls but align with current Google Cloud positioning.
