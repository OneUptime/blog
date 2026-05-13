# Validation Summary: How to Configure HelmRelease Uninstall with disableWait in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Helm
- Kubernetes
- kubectl
- GitOps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Helm uninstall command documentation: https://helm.sh/docs/helm/helm_uninstall/

## Issues Found
- The post incorrectly stated that Flux uninstall does not wait by default. Flux documents `.spec.uninstall.disableWait` as defaulting to `false`, meaning uninstall waits for resources to be deleted unless `disableWait: true` is set. Updated the default-behavior explanation and the recommendation for keeping wait enabled.
- The post described uninstall completion as immediate after delete commands are issued. This was too absolute because Helm hooks and Kubernetes API operations can still affect completion. Updated the wording to focus specifically on skipping the wait for resource deletion.
- The remediation section said Flux performs a fresh install on the next reconciliation cycle. Flux documents that after an uninstall remediation, the controller attempts to reinstall the release, so the wording was changed to avoid over-specifying the exact timing.
- The combined uninstall options section called the example the fastest possible uninstall configuration. This was softened to "one of the fastest" because actual uninstall duration can still depend on API operations and cluster behavior.

## Review Notes
The YAML examples use the current `helm.toolkit.fluxcd.io/v2` HelmRelease API and valid uninstall fields, including `disableHooks`, `disableWait`, `timeout`, and `keepHistory`. The `kubectl` JSONPath command is syntactically valid for inspecting finalizers on resources returned by `kubectl get all`, though it is not a comprehensive inventory of every possible Helm-managed resource type.
