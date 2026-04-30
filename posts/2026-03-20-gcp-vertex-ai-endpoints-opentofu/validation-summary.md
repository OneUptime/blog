# Validation Summary: How to Create GCP Vertex AI Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud
- Vertex AI Endpoints
- Vertex AI Model Registry
- Google Cloud CLI (`gcloud`)
- Infrastructure as Code

## Sources Consulted
- Google Cloud: Terraform support for Vertex AI https://cloud.google.com/vertex-ai/docs/start/use-terraform-vertex-ai
- Google provider docs: `google_vertex_ai_endpoint` https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/vertex_ai_endpoint.html.markdown
- Google provider source: `resource_vertex_ai_endpoint.go` https://github.com/hashicorp/terraform-provider-google/blob/main/google/services/vertexai/resource_vertex_ai_endpoint.go
- Google Cloud: Deploy a model to an endpoint https://cloud.google.com/vertex-ai/docs/general/deployment
- Vertex AI REST API: `projects.locations.endpoints.deployModel` https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.endpoints/deployModel
- Google Cloud SDK: `gcloud ai models upload` https://docs.cloud.google.com/sdk/gcloud/reference/ai/models/upload
- Google Cloud SDK: `gcloud ai endpoints deploy-model` https://docs.cloud.google.com/sdk/gcloud/reference/ai/endpoints/deploy-model
- Google Cloud SDK: `gcloud ai endpoints update` https://docs.cloud.google.com/sdk/gcloud/reference/ai/endpoints/update
- Google Cloud: Custom container requirements for inference https://cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Google Cloud: Prebuilt containers for inference and explanation https://cloud.google.com/vertex-ai/docs/predictions/pre-built-containers

## Issues Found
- The post used `containerregistry.googleapis.com`, but current Vertex AI serving guidance uses Artifact Registry and Vertex AI prebuilt prediction containers. I removed the Container Registry API example and clarified when Artifact Registry is additionally needed.
- The post claimed model upload and endpoint deployment could be managed with OpenTofu resources such as `google_vertex_ai_model` and `google_vertex_ai_endpoint_deployment`. The current Google provider exposes endpoint creation, but deployed models are output-only on the endpoint resource and are managed through the Vertex AI API or `gcloud`. I replaced those HCL snippets with current `gcloud ai models upload`, `gcloud ai endpoints deploy-model`, and `gcloud ai endpoints update` commands.
- The deployment example used an unsupported per-model `traffic_split` field and an API metric name that doesn't match the current `gcloud` deployment flags. I corrected the rollout example to use `--traffic-split=0=100` for the initial deployment, numeric deployed model IDs, `--autoscaling-metric-specs=cpu-usage=60`, and a separate endpoint traffic update for the 90/10 split.
- The service account section granted `roles/aiplatform.user` to a service account that was never attached to the deployment. I corrected the section to explain that a custom runtime service account is optional and only passed during model deployment when the serving container needs additional Google Cloud access.
- The endpoint resource could race API enablement if both were applied together. I added `depends_on = [google_project_service.vertex_ai]` to make the dependency explicit.

## Review Notes
- The current Google provider documentation for `google_vertex_ai_endpoint.name` includes a description that conflicts with the provider's own acceptance-test examples. The post keeps a string endpoint ID because that matches the provider's official examples.
- General custom model upload and deployment are currently split across OpenTofu for endpoint provisioning and `gcloud` or the Vertex AI API for model lifecycle operations. If the provider adds native model or deployed-model resources later, this post should be revisited.
