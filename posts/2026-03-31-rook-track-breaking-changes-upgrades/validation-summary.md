# Validation Summary: How to Track Breaking Changes in Rook Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph
- Kubernetes (kubectl, CRDs, API resources)
- Helm (helm diff plugin)

## Sources Consulted
- Rook official upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/
- Rook GitHub releases: https://github.com/rook/rook/releases
- Rook CRD examples in source: https://github.com/rook/rook/tree/master/deploy/examples
- kubectl documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- helm-diff plugin: https://github.com/databus23/helm-diff

## Issues Found

1. **CRD comparison mismatch**: The original command downloaded the full `crds.yaml` file (containing all Rook CRDs) but compared it against a single exported CRD (`cephclusters.ceph.rook.io`). This diff would produce meaningless output since the files contain entirely different content. Fixed by providing multiple approaches: using `kubectl slice` to extract a single CRD, using `kubectl diff` against the full manifest, and comparing the openAPIV3Schema sections directly.

2. **`kubectl version --short` deprecated**: The `--short` flag was deprecated in kubectl v1.28 and removed in later versions. Replaced with `kubectl version` (without the flag).

3. **Fabricated deprecation details**: The post listed specific deprecation changes between Rook v1.13->v1.14 and v1.14->v1.15 (e.g., `mgr.modules` renamed to `mgr.modules.enabled`, `monitoring.enabled` moved to `monitoring.metricsDisabled`) that are not verifiable against actual Rook release notes and appear to be fabricated. Replaced with guidance to consult official documentation for version-specific deprecations.

4. **Misleading "API Removals" example**: The YAML example under "Handling API Removals" showed before/after snippets that were essentially the same structure with an added field — it did not actually illustrate a field removal or relocation. Replaced with a more representative example showing a configuration field moving from a top-level config to device-level config.

## Review Notes
- The `kubectl slice` tool referenced in the fix is a third-party tool (https://github.com/patrickdappollonio/kubectl-slice). The post provides alternative approaches that use only built-in tools.
- The Rook upgrade documentation URL path (`/Upgrade/rook-upgrade/`) uses title-case which matches the Rook docs site structure but could change in future site reorganizations.
- The helm diff `--reuse-values` flag is correct but users should be aware it can cause issues if new chart versions introduce required values not present in their current release.
