# Validation Summary: How to Test Application Compatibility with New Kubernetes API Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API deprecation and migration
- kubectl and kubectl convert
- kind test clusters
- Pluto deprecated API scanning
- Kubernetes audit logging
- Helm chart testing
- GitHub Actions CI
- Go client-go Ingress API usage
- jq and Bash automation

## Sources Consulted
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl convert installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Pluto documentation and v5.19.0 CLI help: https://pluto.docs.fairwinds.com/advanced/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The deprecation-policy explanation incorrectly stated that APIs are deprecated for at least two minor versions and that an API deprecated in 1.27 could be removed in 1.29. Updated it to match Kubernetes policy: beta APIs are no longer served 9 months or 3 minor releases after deprecation, alpha APIs can be removed without prior notice, and GA APIs are not removed within a major Kubernetes version.
- The kubectl scan comment said it listed all resources, but the command only lists namespaced resources and only sees currently served alpha/beta API versions. Updated the comment to describe that limitation and point readers to manifest scans and API request logs for removed API usage.
- The audit logging section implied that applying a ConfigMap enables API server audit logging. Replaced it with creation of an audit policy file and comments explaining that kube-apiserver must be configured with `--audit-policy-file` and an audit backend such as `--audit-log-path` or `--audit-webhook-config-file`.
- The automated compatibility test used `((failures++))` with `set -e`, which can exit on the first failure because the expression evaluates to zero initially. Replaced it with `failures=$((failures + 1))`.
- The GitHub Actions manifest loop used `k8s/**/*.yaml` without enabling Bash `globstar`, so recursive matching would not work reliably. Replaced it with a `find` loop for `.yaml` and `.yml` files.
- The migration script changed only `apiVersion` with `sed`, which is not enough for APIs like Ingress v1 where fields also changed. Replaced the `sed` conversions with `kubectl convert` targeting `networking.k8s.io/v1` and `batch/v1`.
- The migration script piped pretty-printed `jq` objects into `while read`, which would split objects across lines. Added `jq -c` so each loop iteration receives one complete JSON object.

## Review Notes
The Pluto commands and target-version syntax were checked against Pluto v5.19.0 CLI help. The examples still assume the reader has installed required tools and has a Kubernetes version where the referenced deprecated APIs are still served when running live migration commands.
