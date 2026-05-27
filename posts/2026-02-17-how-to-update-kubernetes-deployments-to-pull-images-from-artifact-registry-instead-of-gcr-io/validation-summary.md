# Validation Summary: How to Update K8s Deployments to Pull Images from Artifact Registry Instead of

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Container Registry
- Google Kubernetes Engine
- Kubernetes Deployments, CronJobs, init containers, and sidecars
- Helm
- Kustomize
- kubectl
- gcloud CLI
- Docker image references

## Sources Consulted
- Google Cloud Artifact Registry repository and image names: https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry gcr.io repositories: https://cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Google Cloud Artifact Registry access control with IAM: https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud SDK `gcloud artifacts repositories add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/add-iam-policy-binding
- Google Kubernetes Engine image pull troubleshooting: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/image-pulls
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Helm `helm upgrade` documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm pod image values best practices: https://helm.sh/docs/chart_best_practices/pods/
- Cloud SQL Auth Proxy documentation: https://cloud.google.com/sql/docs/postgres/sql-proxy

## Issues Found
- The Container Registry shutdown wording was outdated and implied the shutdown was still in the future. Updated it to reflect that Container Registry is already shut down for writes and that gcr.io URLs continue only when backed by Artifact Registry gcr.io repositories or redirection.
- The GKE custom service account section referred to Workload Identity, but image pulls are performed by the node service account. Updated the heading to refer to a custom GKE node service account.
- The Deployment YAML examples had selectors but no matching pod template labels, which makes the examples invalid for `apps/v1` Deployments. Added matching `template.metadata.labels`.
- The Cloud SQL Auth Proxy example used an older image tag and described it as simply hosted on GCR. Updated the tag to the current documented version and clarified that the gcr.io URL is served from an Artifact Registry-backed repository.
- The bulk replacement preview comment said `sed` even though the command used `grep`. Updated the comment.
- The rollout verification command checked only regular containers, even though the guide tells readers to check init containers too. Updated the jsonpath expression to include init containers.

## Review Notes
The post is technically relevant and the remaining examples align with current Kubernetes, Helm, Kustomize, kubectl, gcloud, and Google Cloud documentation. The title appears truncated, but that is an editorial issue rather than a technical correctness issue.
