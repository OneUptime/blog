# Validation Summary: How to Detect Helm Drift with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Flux notification-controller
- Kubernetes
- Helm
- GitOps
- JSON Pointer / RFC 6901

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm drift detection configuration: https://fluxcd.io/flux/installation/configuration/helm-drift-detection/
- Flux v2.2.0 announcement: https://fluxcd.io/blog/2023/12/flux-v2.2.0/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux releases / Kubernetes support policy: https://fluxcd.io/flux/releases/
- Flux `flux get helmreleases` command reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flux install manifest labels: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The prerequisites listed "A Kubernetes cluster (v1.20+)", which is not accurate for supported Flux v2 releases. Current Flux support follows supported Kubernetes versions rather than Kubernetes 1.20, and Flux v2.2.0 itself listed Kubernetes 1.26-1.28 compatibility. Changed this to "A Kubernetes cluster supported by your Flux version."
- The post described `enabled` mode as "re-applying the desired state." Current Flux documentation says drift correction creates and patches resources based on the server-side dry-run apply result. Updated the wording to match the documented behavior.
- The monitoring section implied `flux get helmreleases` shows drift-specific information. The command is valid, but the official reference describes it as showing HelmRelease statuses. Adjusted the wording to avoid overstating drift-specific output.
- The resource usage command used `-l app=helm-controller`. The latest Flux install manifest includes that pod label, but the stable Kubernetes recommended label for the component is `app.kubernetes.io/component=helm-controller`. Updated the command to use the current Flux component label.

## Review Notes
The `spec.driftDetection.mode` values, `ignore.paths` JSON Pointer usage, target selectors, Kubernetes event commands, Flux Alert `inclusionList`, and notification API version are consistent with the official documentation reviewed. The local environment did not have `flux` or `kubectl` installed, so CLI verification was performed against official command references rather than local `--help` output.
