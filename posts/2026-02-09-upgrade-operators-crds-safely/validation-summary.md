# Validation Summary: How to Upgrade Kubernetes Operators and CRDs Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- CustomResourceDefinitions
- Kubernetes Operators
- kubectl
- Helm
- cert-manager
- Prometheus Operator
- Zalando Postgres Operator
- jq
- Bash

## Sources Consulted
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CustomResourceDefinition versioning: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/
- Helm repo add command reference: https://helm.sh/docs/helm/helm_repo_add/
- cert-manager upgrade documentation: https://cert-manager.io/docs/installation/upgrade/
- Zalando Postgres Operator user guide: https://opensource.zalando.com/postgres-operator/docs/user.html
- Zalando Postgres Operator administrator guide: https://opensource.zalando.com/postgres-operator/docs/administrator.html
- Zalando Postgres Operator API package documentation: https://pkg.go.dev/github.com/zalando/postgres-operator/pkg/apis/acid.zalan.do/v1
- helm-diff plugin repository: https://github.com/databus23/helm-diff

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because the current generated kubectl reference documents `kubectl version` with `--client` and `-o/--output`, but not `--short`.
- Clarified that `helm diff upgrade` requires the helm-diff plugin. `helm diff` is not a built-in Helm command.
- Replaced a partial `grep -A 100` CRD comparison with `kubectl diff -f cert-manager-crds-$TARGET_VERSION.yaml` so the example reviews the full CRD manifest instead of an arbitrary 100-line excerpt.
- Reworked the CRD migration example. The previous `sed` replacement of `apiVersion` was not a safe generic conversion or storage migration method. The updated example verifies the new storage version and patches each custom resource so Kubernetes rewrites it through the API server.
- Replaced `kubectl wait --for=condition=Running postgresql/test-cluster` with a JSONPath wait against `.status.PostgresClusterStatus`, which matches the Zalando Postgres Operator status field and kubectl's documented JSONPath wait form.

## Review Notes
The post is technically relevant and broadly accurate after the targeted fixes. `kubectl` and `helm` were not installed in the review workspace, so CLI checks were performed against official generated command references rather than local command output.
