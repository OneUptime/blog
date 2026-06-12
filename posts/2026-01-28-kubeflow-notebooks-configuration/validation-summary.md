# Validation Summary: How to Configure Kubeflow Notebooks

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubeflow Notebooks
- Kubernetes custom resources and Pods
- PersistentVolumeClaims, PersistentVolumes, and emptyDir volumes
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Secrets and environment variables
- kubectl
- Docker container images
- Python Kubernetes client

## Sources Consulted
- Kubeflow Notebooks Quickstart Guide: https://www.kubeflow.org/docs/components/notebooks/quickstart-guide/
- Kubeflow Notebooks v1 API Reference: https://www.kubeflow.org/docs/components/notebooks/api-reference/notebook-v1/
- Kubeflow Notebooks Container Images: https://www.kubeflow.org/docs/components/notebooks/container-images/
- Kubeflow Notebook Controller package documentation: https://pkg.go.dev/github.com/kubeflow/kubeflow/components/notebook-controller
- Kubeflow on AWS notebook culling documentation: https://awslabs.github.io/kubeflow-manifests/docs/deployment/configure-notebook-culling/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Python client reference: https://github.com/kubernetes-client/python/blob/master/kubernetes/README.md

## Issues Found
- The Kubeflow UI step used "New Notebook"; current Kubeflow notebook docs use "New Server" on the Notebook Servers page. Updated the instruction to match the UI.
- Notebook examples used the older `kubeflownotebookswg/jupyter-scipy:v1.8.0` image path. Updated examples to use the current Kubeflow GHCR notebook server image path, `ghcr.io/kubeflow/kubeflow/notebook-servers/jupyter-scipy:v1.10.0`.
- The idle-culling example incorrectly implied that culling is enabled with per-Notebook annotations. Replaced it with controller-level configuration using `kubectl set env` for `ENABLE_CULLING`, `CULL_IDLE_TIME`, and `IDLENESS_CHECK_PERIOD`, and kept the Helm values example as distribution-specific configuration.
- The troubleshooting command selected notebook-controller logs with `app=notebook-controller-deployment`, which does not match the controller label shown in the controller documentation. Updated it to `app=notebook-controller`.
- The Python automation script accepted a `storage` argument and mounted a PVC but never created the PVC. Updated the script to create a `PersistentVolumeClaim` with the Python Kubernetes client before creating the Notebook resource, and removed the unused `yaml` import.

## Review Notes
The generic YAML examples depend on cluster-specific details such as namespaces, default StorageClass names, registry credentials, and Kubeflow distribution packaging. The culling Helm values are valid for distributions that expose those values; other installations may require an equivalent Kustomize or deployment patch.
