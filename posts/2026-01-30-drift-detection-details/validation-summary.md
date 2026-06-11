# Validation Summary: How to Build Drift Detection Details

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes CronJobs
- Kubernetes RBAC
- Kubernetes Python client
- Helm
- Kustomize
- PyYAML
- Python dataclasses and type hints
- Python requests
- Argo CD
- GitOps drift detection

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes client libraries documentation: https://kubernetes.io/docs/reference/using-api/client-libraries/
- Kubernetes Python client repository and generated API docs: https://github.com/kubernetes-client/python
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm `helm template` command documentation: https://helm.sh/docs/helm/helm_template/
- Argo CD documentation: https://argo-cd.readthedocs.io/
- Argo CD Application API type definitions: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- Requests documentation: https://requests.readthedocs.io/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The state collector claimed to support Helm but only implemented plain YAML and Kustomize rendering. Added a Helm chart branch that detects `Chart.yaml` and renders manifests with `helm template <release> <chart> --namespace <namespace>`.
- The Kustomize detector only checked `kustomization.yaml`. Expanded it to also recognize common supported filenames `kustomization.yml` and `Kustomization`.
- The explanatory text after the collector omitted the Helm rendering behavior. Updated it to state that Helm chart directories are rendered through `helm template`.
- The top-level `None` handling in `compute_diff` reversed `added` and `removed` labels. Corrected it so resources or fields present only in actual state are `added`, and resources or fields present only in desired state are `removed`.
- The alert example used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc).isoformat()`.
- The Deployment normalizer comment said `revisionHistoryLimit` and `progressDeadlineSeconds` were set by controllers. Updated the comment to say these are defaulted by the Kubernetes API.

## Review Notes
- `kubectl` was not installed in the local environment, so `kubectl kustomize` was verified against official Kubernetes documentation rather than local `--help` output.
- The examples remain intentionally minimal. A production detector should use more precise RBAC than `resources: ["*"]`, normalize additional resource-specific fields such as Service cluster IP fields, and compare list fields with Kubernetes-aware merge keys where ordering is not semantically meaningful.
