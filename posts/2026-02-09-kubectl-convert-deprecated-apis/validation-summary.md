# Validation Summary: How to Use kubectl-convert to Migrate Deprecated API Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API version migration
- kubectl-convert / kubectl convert plugin
- Kubernetes Ingress, Deployment, CronJob, PodDisruptionBudget, StorageClass, webhooks, and CRDs
- Bash scripting
- Helm templating
- GitHub Actions CI/CD
- yq

## Sources Consulted
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Install and Set Up kubectl on Linux, including kubectl convert plugin installation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl-convert v1.28.4 `--help` output downloaded from https://dl.k8s.io/release/v1.28.4/bin/linux/amd64/kubectl-convert
- Helm `helm template` command documentation: https://helm.sh/docs/helm/helm_template/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- actions/checkout official repository and Marketplace listing: https://github.com/actions/checkout
- actions/github-script official repository and Marketplace listing: https://github.com/actions/github-script

## Issues Found
- The post claimed kubectl-convert fully handles API translation and structural changes. Updated the wording to clarify that it handles many conversions, but output still needs review because Kubernetes documents that converted output may use non-ideal defaults.
- The installation section said kubectl-convert must match the target Kubernetes version. Updated this to say the converter version must support the target API version, which better matches Kubernetes installation and migration guidance.
- The sample converted Ingress output was inaccurate for kubectl-convert v1.28.4. Updated it to include `creationTimestamp`, `status.loadBalancer`, and `pathType: ImplementationSpecific`, which is the actual conversion result for the shown `extensions/v1beta1` Ingress.
- The directory conversion examples had unsafe quoting and flattened nested paths with `basename`, which can overwrite files with the same name. Updated quoting and preserved nested relative paths.
- The bulk conversion script tracked `FAILED_FILES` inside a piped `while` loop, so Bash would update the array in a subshell and the final failure check could be wrong. Changed it to process substitution and corrected the `find` expression.
- The GitHub Actions workflow used older action versions and skipped checksum verification during installation. Updated `actions/checkout` and `actions/github-script` to current major versions and added checksum verification for kubectl-convert.
- The conversion failure section suggested converting CRDs with kubectl-convert, but current kubectl-convert releases do not decode `apiextensions.k8s.io/v1beta1` CRDs. Replaced that command with guidance to follow the CRD provider's migration instructions for CRDs and custom resources.

## Review Notes
- `kubectl-convert` can convert many built-in Kubernetes resource manifests, but it does not replace manual review, provider-specific CRD migration guidance, or server-side validation against the target cluster.
- Server-side dry-run examples require access to a Kubernetes API server that serves the target API versions.
