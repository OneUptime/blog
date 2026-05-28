# Validation Summary: How to Choose Between Vertex AI and Self-Managed ML Infrastructure on GKE

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI custom training
- Vertex AI Pipelines
- Vertex AI Model Registry
- Vertex AI Feature Store
- Vertex AI Model Monitoring
- Vertex AI Workbench
- Google Kubernetes Engine
- GKE GPU node pools
- NVIDIA GPU drivers on GKE
- Kubeflow, Argo Workflows, MLflow, Weights & Biases, Seldon Core, KServe, Triton Inference Server, Prometheus, and Grafana

## Sources Consulted
- Google Cloud Vertex AI custom training pipelines documentation: https://docs.cloud.google.com/vertex-ai/docs/training/create-training-pipeline
- Google Cloud Vertex AI custom containers overview: https://docs.cloud.google.com/vertex-ai/docs/training/containers-overview
- Google Cloud Vertex AI Pipelines introduction: https://cloud.google.com/vertex-ai/docs/pipelines/introduction
- Google Cloud Vertex AI Feature Store documentation: https://cloud.google.com/vertex-ai/docs/featurestore
- Google Cloud Vertex AI Model Monitoring documentation: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/overview
- Google Cloud Vertex AI Workbench introduction: https://docs.cloud.google.com/vertex-ai/docs/workbench/introduction
- Google Cloud GKE GPU node pool documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/gpus
- Google Cloud SDK reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK reference for `gcloud container node-pools create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud Vertex AI pricing: https://cloud.google.com/vertex-ai/pricing
- Google Cloud GKE pricing: https://cloud.google.com/kubernetes-engine/pricing

## Issues Found
- The GKE cluster creation comment said the cluster was created with a GPU node pool, but the GPU node pool is added in the next command. Changed the comment to say the command creates a GKE cluster for ML workloads.
- The GPU node pool command omitted the current `gpu-driver-version` accelerator option. Added `gpu-driver-version=default`, which matches current GKE guidance for automatic NVIDIA driver installation on supported GKE versions.
- The NVIDIA driver installation step was written as unconditional. Current GKE versions can automatically install default NVIDIA drivers for GPU nodes, so the post now says manual installation might be needed on older GKE versions.
- The cost comparison said self-managed GKE avoids platform fees and is "compute only." GKE has cluster management charges, so the wording now says it avoids many managed ML platform fees while noting GKE cluster management charges, and the matrix now says "mostly infrastructure."

## Review Notes
Vertex AI Feature Store (Legacy) is deprecated and scheduled for sunset on February 17, 2027, but the post refers to Vertex AI Feature Store generically and does not depend on legacy-only APIs. Vertex AI Model Monitoring has GA v1 support for Vertex AI endpoints and Preview v2 support for tabular models served outside Vertex AI, including GKE, so hybrid monitoring claims are directionally correct but should be revisited if the post is expanded into implementation steps.
