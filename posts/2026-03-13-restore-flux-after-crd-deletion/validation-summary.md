# Validation Summary: How to Restore Flux State After Accidental CRD Deletion

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Flux CD (v2 / GitOps toolkit)
- Kubernetes CustomResourceDefinitions (CRDs)
- kubectl CLI
- flux CLI
- cert-manager (as an example third-party CRD)
- Velero (for backup/restore)
- Kyverno (admission policy)

## Sources Consulted
- Flux CD `flux bootstrap github` documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux2 GitHub releases: https://github.com/fluxcd/flux2/releases
- Flux GitOps Toolkit API reference (Kustomization v1, source.toolkit.fluxcd.io)
- Kyverno policy documentation: https://kyverno.io/docs/policy-types/cluster-policy/
- Kyverno match/exclude reference for `operations` and `deny.conditions`
- Velero CLI reference (`velero restore create --from-backup --include-resources`)
- Kubernetes `kubectl patch` documentation and finalizer behavior

## Issues Found

1. **Invalid `--token-env` flag on `flux bootstrap github`** (Step 2). The `flux bootstrap github` command does not expose a `--token-env` flag. The `GITHUB_TOKEN` environment variable is read implicitly from the shell environment. Replaced the bogus flag with an explicit `export GITHUB_TOKEN=<your-token>` line preceding the bootstrap invocation, which is the pattern shown in the official Flux docs.

## Review Notes
- The list of "Expected Flux CRDs" in Step 1 is correct as written but is not exhaustive — Flux also installs CRDs from the `notification.toolkit.fluxcd.io` group (`alerts`, `providers`, `receivers`) and `buckets`/`ocirepositories` under `source.toolkit.fluxcd.io`. The post does not claim completeness, so this is left as-is.
- The "do-not-delete" finalizer technique in Step 6 is a known pattern but has a caveat: once `kubectl delete crd` is invoked, Kubernetes sets a `deletionTimestamp` and the CRD enters `Terminating` state. The finalizer prevents object removal but the CRD becomes effectively read-only (no new custom resources can be created). This is acceptable for "freeze" scenarios but worth understanding; the post does not elaborate.
- The Kyverno policy uses the legacy `match.resources.kinds` form with a `deny.conditions` check on `{{request.operation}}`. Per Kyverno docs, `deny` rules do consider DELETE operations (unlike validate-overlay rules which implicitly ignore them), so this policy will work as intended. Modern Kyverno (1.9+) idiom would prefer adding an explicit `operations: [DELETE]` under `match`, but the current form is still valid.
- The `kubectl patch --type=merge` with finalizers will replace any pre-existing finalizers array on the CRD, since JSON merge patch replaces (rather than merges) arrays. For most CRDs this is fine as they start with an empty finalizers list, but readers patching CRDs that already have finalizers (rare) should use a JSON patch with an `add` operation instead.
- The `kubectl apply -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml` URL is a valid, supported Flux2 release asset.
