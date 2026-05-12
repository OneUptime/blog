# Validation Summary: How to Implement Policy-as-Code for Deployment Governance with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (HelmRelease, Kustomization, notification-controller Alert)
- OPA Gatekeeper (ConstraintTemplate, Constraint, Rego)
- Kubernetes admission control
- Conftest (CI policy validation)
- kube-linter
- GitHub Actions

## Sources Consulted
- Gatekeeper installation docs: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper Helm chart values: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
- Gatekeeper how-to (ConstraintTemplate / Constraint apiVersions): https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Flux notification-controller Alert docs: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API v1 reference: https://fluxcd.io/flux/components/notification/api/v1/
- Conftest releases: https://github.com/open-policy-agent/conftest/releases
- kube-linter releases: https://github.com/stackrox/kube-linter/releases

## Issues Found

1. **Conftest download URL was incorrect.** The post used `https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz`. The conftest release assets are actually published as `conftest_<version>_Linux_x86_64.tar.gz` (e.g. `conftest_0.68.2_Linux_x86_64.tar.gz`); there is no version-less asset, so the `latest/download/...` shortcut would 404. Replaced the install step with a two-line snippet that first reads the latest tag from the GitHub releases API and then downloads the correctly named asset.

2. **Flux Alert apiVersion was `notification.toolkit.fluxcd.io/v1`, which is not yet GA for `Alert`.** The Flux notification-controller has promoted `Receiver` to `v1`, but `Alert` (and `Provider`) are still served at `v1beta3` — the official Alert docs explicitly note that `.spec.summary` "will be removed in Alert API v1 GA," confirming v1 is a future state. Changed the apiVersion to `notification.toolkit.fluxcd.io/v1beta3`, which keeps the existing `spec.summary` field valid.

## Review Notes

- The kube-linter download URL (`kube-linter-linux.tar.gz`) is a real release asset and works with the `releases/latest/download/...` shortcut.
- Gatekeeper Helm values (`replicas`, `auditInterval`, `constraintViolationsLimit`, `emitAdmissionEvents`, `emitAuditEvents`) are all correct per the official chart values.yaml. `emitAdmissionEvents`/`emitAuditEvents` are marked alpha upstream; the post's usage is fine but readers should be aware of that status.
- ConstraintTemplate `templates.gatekeeper.sh/v1` is GA; Constraint resources still live under `constraints.gatekeeper.sh/v1beta1`. The mismatch is by design upstream and the post uses both correctly.
- `Alert.spec.summary` is deprecated in v1beta3 and slated for removal in v1 GA; readers migrating to Alert v1 in the future will need to move that text into `eventMetadata` or similar. Not changed here since v1 is not yet available.
- The Rego in `requirenonroot` only checks `spec.securityContext.runAsNonRoot`. Container-level `securityContext` can also satisfy/violate the non-root requirement; left as-is since the post says "Check pod-level security context" and is intentionally a minimal example.
- `enforcementAction: dryrun` is documented in the post body; the example constraints set `enforce` directly. That is consistent with the "Best Practices" note that recommends starting with `dryrun` and graduating to `enforce`.
