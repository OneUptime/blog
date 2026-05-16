# Validation Summary: How to Set Up Flux CD on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Flux CD
- Flux bootstrap and CLI
- Flux Kustomization, HelmRelease, HelmRepository, ImageRepository, ImagePolicy, and ImageUpdateAutomation APIs
- Kustomize overlays
- Prometheus Operator PodMonitor
- SOPS and age
- Bitnami Sealed Secrets

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux bootstrap GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- Flux Sealed Secrets guide: https://fluxcd.io/flux/guides/sealed-secrets/
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/
- Talos Linux homepage and product overview: https://www.talos.dev/

## Issues Found
- The prerequisites only required generic kubectl access. Flux bootstrap requires cluster-admin rights on the target cluster, so the prerequisite was changed to "cluster-admin kubectl access."
- The bootstrap command did not install the image-reflector-controller or image-automation-controller, but the post later uses Flux image automation resources. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The bootstrap command used the default deploy-key workflow without granting write access, but ImageUpdateAutomation needs to push commits back to Git. Added `--read-write-key`.
- The repository layout and Flux Kustomization path pointed at `./infrastructure/controllers`, but there was no root `infrastructure/controllers/kustomization.yaml` to include nested controller directories. Added that file to the tree and included a matching Kustomize snippet.
- The ingress-nginx directory listed a `kustomization.yaml` but did not show its required resources. Added a minimal `infrastructure/controllers/ingress-nginx/kustomization.yaml` snippet referencing `namespace.yaml` and `release.yaml`.
- The monitoring example used `ServiceMonitor` with `endpoints`, while Flux's official Prometheus Operator example uses `PodMonitor` with `podMetricsEndpoints` to scrape controller pods on the `http-prom` port. Updated the manifest accordingly.

## Review Notes
- The remaining Flux API versions in the post (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `image.toolkit.fluxcd.io/v1`) match current Flux documentation.
- Flux Kubernetes version support changes over time; the post's `flux check --pre` command is the right way for readers to verify their cluster against their installed Flux CLI version.
