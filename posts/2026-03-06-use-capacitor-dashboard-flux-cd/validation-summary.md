# Validation Summary: How to Use Capacitor Dashboard with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Capacitor
- Kubernetes
- Kubernetes RBAC
- Kubernetes Ingress
- Kubernetes NetworkPolicy
- Kustomize
- kubectl

## Sources Consulted
- Capacitor upstream README for `capacitor-v0.4.3`: https://raw.githubusercontent.com/gimlet-io/capacitor/capacitor-v0.4.3/README.md
- Capacitor upstream Kubernetes manifest for `capacitor-v0.4.3`: https://raw.githubusercontent.com/gimlet-io/capacitor/capacitor-v0.4.3/deploy/k8s/manifest.yaml
- Capacitor upstream RBAC manifest for `capacitor-v0.4.3`: https://raw.githubusercontent.com/gimlet-io/capacitor/capacitor-v0.4.3/deploy/k8s/rbac.yaml
- Capacitor current project README: https://github.com/gimlet-io/capacitor
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI reconcile HelmRelease documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Flux-managed install used a `GitRepository` with tag `v0.4.3` and path `./deploy/manifests`, but the upstream Capacitor tag is `capacitor-v0.4.3` and the documented Flux install uses an OCI artifact. Replaced the source with an `OCIRepository` for `oci://ghcr.io/gimlet-io/capacitor-manifests` and updated the Flux `Kustomization` to use `path: ./`, `wait`, `retryInterval`, and `timeout`.
- The Kubernetes version prerequisite was pinned to `v1.26 or later`, which is stale against current Flux support guidance. Changed it to require a Kubernetes cluster supported by the Flux release in use.
- The hand-written RBAC example did not match Capacitor's published RBAC for the referenced release and omitted permissions Capacitor uses for Kubernetes resources and force reconciliation. Updated the ClusterRole resources and verbs to match the upstream intent.
- The deployment and service labels used `app: capacitor`, while upstream Capacitor manifests use `app.kubernetes.io/name: onechart` and `app.kubernetes.io/instance: capacitor`. Updated selectors, verification commands, troubleshooting commands, and the NetworkPolicy pod selector to match.
- The dashboard overview listed notification resources, but the referenced Capacitor release focuses on Flux sources, Kustomizations, HelmReleases, and Kubernetes resources deployed by Flux. Replaced the notification bullet with Kubernetes resources deployed by Flux.
- The reconciliation section described Capacitor as primarily read-only, while upstream RBAC includes `patch` permissions for force reconciliation. Updated the wording to state that Capacitor can trigger reconciliation when its service account has patch permissions, while retaining the CLI commands.
- The DNS egress NetworkPolicy rule allowed port 53 to all namespaces. Narrowed the example to `kube-system` pods labeled `k8s-app: kube-dns`, which better matches the stated intent.

## Review Notes
- All YAML code blocks in the post were parsed with PyYAML after edits.
- The local `flux` and `kubectl` CLIs were not available in this environment, so command validation was performed against official Flux and Kubernetes documentation rather than local `--help` output.
