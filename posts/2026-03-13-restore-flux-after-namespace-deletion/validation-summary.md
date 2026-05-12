# Validation Summary: How to Restore Flux State After Accidental Namespace Deletion

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Flux CD (GitOps toolkit: kustomize-controller, source-controller)
- Kubernetes (Namespaces, Deployments, Services, ConfigMaps)
- `kubectl` CLI
- `flux` CLI
- Bitnami Sealed Secrets
- External Secrets Operator
- Kubernetes PersistentVolumes and PersistentVolumeClaims (Retain reclaim policy)
- `jq` (for parsing kubectl JSON output)

## Sources Consulted
- Flux `flux reconcile source git` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux `flux reconcile kustomization` reference (including `--with-source`): https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux `flux get sources` reference (`all` subcommand, `-A` flag): https://fluxcd.io/flux/cmd/flux_get_sources/
- Flux `flux get kustomizations` reference (`-w/--watch` flag): https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux get all` reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux Kustomization spec (`targetNamespace`): https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Sealed Secrets issue #224 on recreating deleted Secrets: https://github.com/bitnami-labs/sealed-secrets/issues/224
- Kubernetes PV reclaim policy / claimRef behavior: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
- Kubernetes issue #65581 (clearing `claimRef` to make a Released PV Available): https://github.com/kubernetes/kubernetes/issues/65581

## Issues Found

1. **Incorrect Sealed Secrets reconcile annotation (Step 4).**
   The post recommended running `kubectl annotate sealedsecret my-app-secret -n production sealedsecrets.bitnami.com/managed=true --overwrite` to "force the controller to reconcile." This is factually wrong:
   - The `sealedsecrets.bitnami.com/managed: "true"` annotation is intended to be placed on a regular **Secret** (to bring an existing Secret under sealed-secrets management), not on a SealedSecret.
   - It does not trigger reconciliation; the sealed-secrets controller has no dedicated "reconcile now" annotation.

   **Fix:** Replaced the annotation command with `kubectl rollout restart deployment sealed-secrets-controller -n kube-system`, which is a supported way to force the controller to re-process all SealedSecrets and re-materialize missing Secrets.

2. **Fragile PV `claimRef` patch (Step 5).**
   The post used `kubectl patch pv pvc-abc123 -p '{"spec":{"claimRef":{"name":null,"namespace":null,"uid":null}}}'`. With a default strategic-merge patch, setting individual sub-fields of `claimRef` to `null` does not reliably remove them, and may leave the PV in `Released`.

   **Fix:** Replaced with the standard pattern `kubectl patch pv pvc-abc123 --type=merge -p '{"spec":{"claimRef": null}}'`, which clears the whole `claimRef` object and reliably transitions a Released PV to Available (per Kubernetes issue #65581).

## Review Notes
- All Flux CLI commands and flags used (`flux reconcile source git`, `flux reconcile kustomization ... --with-source`, `flux get sources all -A`, `flux get kustomizations -A --watch`, `flux get all -n flux-system`) are correct against current Flux2 documentation.
- `flux get all` is documented as "in preview and under development" — its output format may change across Flux releases, but the command itself is supported.
- `spec.targetNamespace` on a `kustomize.toolkit.fluxcd.io/v1` Kustomization is correct. Worth noting (not added to the post, but a useful future caveat): kustomize-controller will not auto-create the target namespace, which is exactly why Step 2 ("recreate the namespace manually") is the correct unblock.
- The PVC YAML using `volumeName` to pin to a specific PV is valid and is the recommended approach when re-binding to a retained PV.
- The `dependsOn` recommendation in Best Practices refers to Flux Kustomization `spec.dependsOn`, which is a valid field for ordering reconciliations.
