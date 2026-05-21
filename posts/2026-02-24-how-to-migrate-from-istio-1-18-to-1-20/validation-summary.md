# Validation Summary: How to Migrate from Istio 1.18 to 1.20

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- istioctl
- EnvoyFilter
- Gateway API
- DestinationRule
- ExternalName Services

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Upgrade with Helm: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio 1.19 Upgrade Notes: https://istio.io/latest/news/releases/1.19.x/announcing-1.19/upgrade-notes/
- Istio 1.20 Upgrade Notes: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/upgrade-notes/
- Istio 1.20.0 Change Notes: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/change-notes/
- Istio 1.20.x Releases: https://istio.io/latest/news/releases/1.20.x/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The upgrade path statement did not distinguish revision-based upgrades from in-place upgrades. Updated it to clarify that skipping one minor version is supported for revision-based upgrades, while in-place upgrades should move through each intermediate minor release.
- The Istio 1.19 breaking-change list contained inaccurate items about Gateway API defaults, ExternalName handling, and Prometheus merge defaults. Replaced it with official 1.19 upgrade-note items: EnvoyFilter canonical names and typed configs, Helm base chart removals, and Gateway API Service parentRef `group: ""`.
- The Istio 1.20 breaking-change list included unsupported claims about IstioOperator restructuring and Mixer telemetry removal. Replaced it with official 1.20 notes about Kubernetes support, ExternalName behavior, ambient installation changes, and Gateway API policy attachment.
- `kubectl version --short` is no longer current in kubectl documentation. Replaced it with `kubectl version`.
- The download and Helm examples used Istio 1.20.0 even though 1.20.8 is the final 1.20 patch release. Updated examples to 1.20.8.
- The DestinationRule section implied `networking.istio.io/v1alpha3` was a deprecated field. Reworded it to recommend the stable API version for new manifests without claiming old manifests are invalid.
- The namespace relabel commands could fail when replacing an existing revision label. Added `--overwrite` to revision label commands.
- `istioctl authn tls-check` is not present in current istioctl command documentation. Replaced it with `istioctl x describe pod` for inspecting workload-related Istio configuration.
- The old control plane removal sequence used `istioctl uninstall --revision default`, which is not the right command for a non-revisioned old installation. Updated the section to set the default tag first, use a real old revision name for revisioned installs, and use the original install options for non-revisioned installs.
- The rollback section assumed the old control plane had not been removed and was non-revisioned. Clarified that rollback must happen before old control plane removal and that the shown labels apply to a non-revisioned old install.

## Review Notes
Istio 1.20 is no longer a supported Istio minor version as of this review date, but the post is a version-specific migration guide and remains technically useful when framed around the final 1.20 patch release. Future improvements could add separate examples for revision tags versus direct revision labels and for Helm gateway canary installs in a separate gateway namespace.
