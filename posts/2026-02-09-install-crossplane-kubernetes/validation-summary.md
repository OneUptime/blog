# Validation Summary: How to Install Crossplane on Kubernetes Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Helm
- Crossplane
- Crossplane CLI
- Crossplane provider packages
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Kubernetes RBAC

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane CLI reference: https://docs.crossplane.io/latest/cli/
- Crossplane CLI command reference: https://docs.crossplane.io/latest/cli/command-reference/
- Crossplane Helm chart README: https://github.com/crossplane/crossplane/blob/main/cluster/charts/crossplane/README.md
- Crossplane metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Crossplane upgrade documentation: https://docs.crossplane.io/latest/guides/upgrade-crossplane/
- Crossplane uninstall documentation: https://docs.crossplane.io/latest/guides/uninstall-crossplane/
- Crossplane v2 upgrade documentation: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The prerequisites used `kubectl version --short` and described Kubernetes `1.19+`. Current Kubernetes docs list `kubectl version` without `--short`, and Crossplane docs require an actively supported Kubernetes version. Updated both.
- The Helm install command manually created the namespace but did not use the documented `--create-namespace` option. Added it to match official Crossplane install guidance.
- The expected Crossplane CRD list omitted current v2 managed resource CRDs. Added `ManagedResourceDefinition` and `ManagedResourceActivationPolicy` CRDs.
- The Crossplane CLI install command used the old `master` branch URL, `crossplane --version`, and `crossplane completion bash`. Updated to the current `main` install script, `crossplane version`, and `crossplane completions`.
- Helm values used `resources`, which is not the Crossplane chart key for the Crossplane pod. Updated production and HA examples to `resourcesCrossplane`.
- The image override example used an outdated `v1.14.0` tag and an incomplete repository path. Updated it to a v2.3 example path.
- The Prometheus alert used `crossplane_reconcile_errors_total`, which is not listed in current Crossplane metrics. Updated it to `controller_runtime_reconcile_errors_total`.
- RBAC examples used old AWS provider API groups such as `database.aws.crossplane.io` and `storage.aws.crossplane.io`. Updated them to v2-style namespaced Upbound API groups for RDS and S3 examples.
- Provider installation used the old `kubectl crossplane install provider` syntax and unqualified package names. Updated to `crossplane xpkg install provider` with fully qualified `xpkg.crossplane.io` package references.
- Provider health and troubleshooting commands referenced stale provider object names. Updated them to match the corrected AWS S3 provider package name.

## Review Notes
The post now aligns with current Crossplane v2.3 documentation. Future maintenance should re-check specific provider package names and versions because Crossplane provider packaging and cloud-provider coverage changes over time.
