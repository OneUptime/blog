# Validation Summary: How to Configure Flagger with Linkerd Service Mesh and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux
- Flagger
- Linkerd
- Linkerd Viz
- Linkerd SMI
- HelmRelease and HelmRepository resources
- Progressive delivery and canary deployments

## Sources Consulted
- Flux documentation: Bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flagger documentation: Install on Kubernetes with Flux: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger documentation: Linkerd Canary Deployments: https://fluxcd.io/flagger/tutorials/linkerd-progressive-delivery/
- Flagger documentation: Alerting: https://fluxcd.io/flagger/usage/alerting/
- Linkerd documentation: CLI install reference: https://linkerd.io/2/reference/cli/install/
- Linkerd documentation: Installing Linkerd: https://linkerd.io/2-edge/tasks/install/
- Linkerd documentation: Progressive Delivery: https://linkerd.io/2/tasks/flagger/
- Linkerd documentation: Linkerd SMI extension: https://linkerd.io/2.10/tasks/linkerd-smi/
- Linkerd documentation: Viz CLI reference: https://linkerd.io/2/reference/cli/viz/

## Issues Found
- The Flux bootstrap example used `--personal` with `--owner=your-org`. The Flux docs use `--personal` for personal GitHub accounts, so the example was changed to `--owner=your-github-username`.
- The prerequisites pinned Kubernetes to `v1.25 or later`, which is not a stable compatibility claim for current Linkerd releases. It was changed to require a Kubernetes cluster compatible with the selected Linkerd release.
- The Flagger HelmRepository used the legacy `https://flagger.app` chart repository. The current Flagger Flux install docs use the OCI Helm chart source at `oci://ghcr.io/fluxcd/charts`, so the HelmRepository was updated to `type: oci` with that URL.
- The Flagger HelmRelease did not specify CRD handling. The current Flagger Flux install docs set `install.crds: CreateReplace` and `upgrade.crds: CreateReplace`, so those fields were added.
- The Flagger examples installed Flagger in `flux-system`. The current Flagger docs install it in `flagger-system`, so a namespace manifest was added and the Helm resources and log command were updated to use `flagger-system`.
- The Linkerd setup omitted the Linkerd SMI extension, but the Flagger Linkerd tutorial notes that Linkerd 2.12 and later need it for TrafficSplit support. Commands to install and check Linkerd SMI were added.
- The Flagger Helm values omitted `linkerdAuthPolicy.create: true`, which the Flagger Linkerd tutorial notes is required for Linkerd 2.12 and later. That value was added.

## Review Notes
The post now follows the Flagger Linkerd path that uses SMI TrafficSplit support. Linkerd's current progressive delivery documentation also shows a Gateway API-based flow using HTTPRoute and custom MetricTemplate resources; that would be a larger alternative approach rather than a minimal correction to this post.
