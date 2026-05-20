# Validation Summary: How to Deploy MLflow with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow Tracking Server and backend/artifact stores
- Argo CD Applications and automated sync
- Kubernetes Deployments, StatefulSets, Services, Ingress, Secrets, and HPAs
- Kustomize overlays and patches
- PostgreSQL
- Amazon S3 and EKS IAM Roles for Service Accounts
- ingress-nginx basic authentication
- cert-manager Ingress annotations

## Sources Consulted
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow tracking server documentation: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow CLI documentation: https://mlflow.org/docs/latest/cli.html
- MLflow official Docker image documentation: https://mlflow.org/docs/latest/ml/docker
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Deployment concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Amazon EKS IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- ingress-nginx basic authentication documentation: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/
- cert-manager Ingress documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The MLflow container image used `ghcr.io/mlflow/mlflow:2.10.0`, but the official MLflow image version tags use a leading `v`, such as `v2.0.1`. Changed the Deployment image and upgrade command to use `v2.10.0` and `v2.11.0`.
- The Deployment did not set a rolling update strategy, but the post claimed `maxUnavailable: 0` was the default. Kubernetes defaults `maxUnavailable` to `25%`. Added an explicit `RollingUpdate` strategy with `maxUnavailable: 0` and `maxSurge: 1`, and corrected the explanatory text.
- The PostgreSQL backend URI, including the database password, was stored in a ConfigMap. Moved `MLFLOW_BACKEND_STORE_URI` into the Secret and added the Secret to the MLflow Deployment `envFrom` list so the server can still read it.
- The production Kustomize overlay used `patchesStrategicMerge`, which is deprecated in current Kustomize. Updated it to the current `patches` field with `path` entries.

## Review Notes
- The post remains a valid GitOps deployment guide, but the sample MLflow versions are old for a 2026 post. They still demonstrate the workflow, but a future refresh should update the versions after validating migration notes for the target MLflow release.
- The sample uses a placeholder `changeme` password and notes that sealed secrets should be used in production. In a real GitOps repository, the whole Secret should be managed through Sealed Secrets, External Secrets Operator, or another secret-management workflow.
