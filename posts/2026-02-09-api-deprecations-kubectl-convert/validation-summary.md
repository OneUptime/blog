# Validation Summary: How to Handle Kubernetes API Deprecations and Migration with kubectl-convert

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API deprecations and removals
- kubectl and kubectl-convert
- Kubernetes manifests for Deployment, CronJob, Ingress, PodSecurityPolicy, and Namespace
- Kube-No-Trouble (kubent)
- Pluto
- Helm charts
- GitHub Actions
- Kubernetes audit logging and API server metrics

## Sources Consulted
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes install kubectl-convert on Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes install kubectl-convert on macOS: https://kubernetes.io/docs/tasks/tools/install-kubectl-macos/
- Kubernetes kubectl plugin documentation: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- kubectl-convert current `--help` output from the official Kubernetes release binary
- Kubernetes API warning and deprecated API metrics guidance: https://kubernetes.io/blog/2020/09/03/warnings/
- Kube-No-Trouble repository: https://github.com/doitintl/kube-no-trouble
- Pluto documentation: https://pluto.docs.fairwinds.com/
- Krew documentation: https://krew.sigs.k8s.io/docs/
- Helm chart documentation: https://helm.sh/docs/v3/topics/charts/

## Issues Found
- Corrected the opening claim that deprecated APIs simply stop working on upgrade. Deprecated APIs fail only after the API version is removed; existing persisted objects remain accessible through served API versions.
- Corrected the Kubernetes deprecation policy summary. GA API versions are not removed within the same Kubernetes major version, and beta removal timing is 9 months or 3 minor releases, whichever is longer.
- Corrected `extensions/v1beta1` Deployment removal timing from v1.22 to v1.16.
- Corrected `policy/v1beta1` PodSecurityPolicy deprecation timing from v1.16 to v1.21, with removal in v1.25.
- Replaced unsupported or unreliable kubectl-convert install guidance. Removed the `brew install kubectl-convert` and Krew `convert` examples, and used official release binary installation commands.
- Made kubectl-convert install snippets architecture-aware for Linux and macOS.
- Fixed directory conversion examples so mixed manifests convert to their preferred API versions instead of forcing every file to `apps/v1`.
- Added `mkdir -p converted` and fixed shell quoting in conversion loops.
- Corrected the converted Ingress `pathType` to `ImplementationSpecific`, matching Kubernetes migration guidance and kubectl-convert output for v1beta1 Ingress behavior.
- Replaced `kubectl get deployments -o yaml | grep apiVersion` as a deprecation-warning check because it only shows the served API version. Used API server deprecated API metrics instead.
- Updated the GitHub Actions checkout action from `actions/checkout@v3` to `actions/checkout@v4`.
- Replaced direct `kubectl-convert` invocation in CI with `kubectl convert`, matching the plugin usage shown elsewhere.
- Fixed Helm guidance so Helm templates are rendered before running kubectl-convert; unrendered Helm template files are not plain Kubernetes YAML.
- Replaced removed/unsupported `kubectl version --short` with `kubectl version`.
- Fixed the migration timeline to write and validate the same `converted.yaml` output file.

## Review Notes
kubectl-convert can use defaulted values that are technically valid but not always ideal for a workload, so converted manifests should still be reviewed and tested. Kubeval remains mentioned as an additional validator, but future revisions could consider kubeconform because kubeval is no longer the most actively maintained validator.
