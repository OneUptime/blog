# Validation Summary: How to Manage Kubeflow Pipelines with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Kubeflow Pipelines
- Argo Workflows
- MySQL
- MinIO/S3-compatible object storage

## Sources Consulted
- Kubeflow Pipelines standalone deployment documentation: https://www.kubeflow.org/docs/components/pipelines/legacy-v1/installation/standalone-deployment/
- Kubeflow Pipelines installation documentation: https://www.kubeflow.org/docs/components/pipelines/operator-guides/installation/
- Kubeflow Pipelines compile-to-Kubernetes-manifest documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/compile-a-pipeline/
- Kubeflow Pipelines object store configuration documentation: https://www.kubeflow.org/docs/components/pipelines/operator-guides/configure-object-store/
- Kubeflow Pipelines official 2.15.0 manifests: https://github.com/kubeflow/pipelines/tree/2.15.0/manifests/kustomize
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo Workflows executor documentation: https://argo-workflows.readthedocs.io/en/release-3.5/workflow-executors/
- Argo Workflows Helm chart 0.40.0 values from the official argo-helm repository: https://github.com/argoproj/argo-helm
- MinIO release references: https://github.com/minio/minio/releases

## Issues Found
- The GitOps repository layout omitted KFP cluster-scoped resources and CRDs. Added `cluster-scoped-resources/` to the example layout and base `kustomization.yaml`, matching the official standalone installation flow.
- The Argo Workflows Helm example used `controller.containerRuntimeExecutor: emissary`, but Argo Workflows removed `containerRuntimeExecutor` in v3.4 and the argo-workflows chart 0.40.0 values no longer include it. Removed the obsolete value and clarified that a separate Argo Workflows install is only needed when managing it separately from upstream KFP manifests.
- The KFP API server image used older `gcr.io/ml-pipeline` naming and version `2.0.5`. Updated it to the current `ghcr.io/kubeflow/kfp-api-server:2.15.0` image used by official KFP manifests.
- The API server database environment omitted current MySQL-specific configuration fields. Added `DB_DRIVER_NAME` and `DBCONFIG_MYSQLCONFIG_*` variables based on official KFP manifests.
- The API server readiness probe used `/apis/v2beta1/healthz`, but official KFP manifests use `/apis/v1beta1/healthz`. Corrected the probe path.
- The KFP UI image used older `gcr.io/ml-pipeline` naming and version `2.0.5`. Updated it to `ghcr.io/kubeflow/kfp-frontend:2.15.0`.
- The KFP UI Service exposed port `3000` directly, while official manifests expose service port `80` with `targetPort: 3000`. Updated the Service and Ingress backend port accordingly.
- The pipeline-definition example stored an Argo Workflow inside a ConfigMap, which would not register a Kubeflow pipeline through Argo CD. Replaced it with `Pipeline` and `PipelineVersion` custom resources for KFP Kubernetes Native API mode and noted the KFP 2.14.0+ requirement.

## Review Notes
The post remains a high-level GitOps guide rather than a complete production KFP distribution. In a production implementation, start from the official Kubeflow Pipelines Kustomize manifests and apply environment-specific overlays, because the full upstream stack includes additional services, RBAC, ConfigMaps, controllers, and security settings beyond the abbreviated examples shown here.
