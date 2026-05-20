# Validation Summary: How to Share Resources Between Argo Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Argo Workflows
- Argo Events
- Argo Rollouts
- Kubernetes Secrets and ConfigMaps
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- External Secrets Operator
- Kubernetes Reflector
- MinIO and S3-compatible artifact storage
- Prometheus

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo Workflows artifact repository documentation: https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/v0.10.5/api/externalsecret/
- Kubernetes Reflector documentation: https://hub.docker.com/r/emberstack/kubernetes-reflector
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- MinIO root credentials documentation: https://min.io/docs/minio/linux/reference/minio-server/settings/root-credentials.html
- Argo CD Image Updater registry documentation: https://argocd-image-updater.readthedocs.io/en/release-0.12/configuration/registries/

## Issues Found
- The registry credentials section said ArgoCD may need registry access for pulling image information. Argo CD itself does not normally inspect container registries for tags; Argo CD Image Updater does. Updated the text to name Argo CD Image Updater.
- The artifact storage section implied Argo Rollouts Analysis can read S3 directly as a custom metric source. The official Rollouts analysis providers include providers such as Prometheus and Job, not direct S3 artifact reads. Updated the wording to describe rollout analysis jobs and workflow steps using the shared object store when needed.
- The MinIO deployment used `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`. Current MinIO documentation uses `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` for root credentials. Updated the environment variable names.
- The notification secret used Reflector auto namespace configuration without enabling automatic reflection. Added `reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"`.
- The shared ConfigMap was created in the `shared` namespace but consumed through `configMapKeyRef` from an Argo Workflow without accounting for namespace scoping. Kubernetes pod ConfigMap references are namespace-local unless application code calls the API directly. Added Reflector annotations so the ConfigMap is mirrored into the consuming Argo namespaces and updated the wording to reference the mirrored ConfigMap.
- The Prometheus section said Argo Workflows can use Prometheus for pipeline metrics and suggested pointing both tools to Prometheus. Argo Workflows exposes metrics for Prometheus scraping; Rollouts points analysis queries at Prometheus. Updated the wording to reflect that relationship.

## Review Notes
The snippets are illustrative and still assume supporting resources exist, such as the External Secrets `ClusterSecretStore`, target namespaces, MinIO bucket, MinIO credentials Secret, PVC, and Prometheus installation. The Kubernetes NetworkPolicy example is syntactically valid, but it only affects clusters with a network plugin that enforces NetworkPolicy.
