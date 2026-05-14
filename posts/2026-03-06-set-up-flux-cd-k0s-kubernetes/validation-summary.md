# Validation Summary: How to Set Up Flux CD on k0s Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- k0s Kubernetes
- Kubernetes manifests
- Kustomize
- HelmRelease and HelmRepository resources
- Flux notification resources
- k0sctl

## Sources Consulted
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux installation and CLI documentation: https://fluxcd.io/flux/installation/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- k0s installation documentation: https://docs.k0sproject.io/stable/install/
- k0s controller installation CLI documentation: https://docs.k0sproject.io/stable/cli/k0s_install_controller/
- k0s kubeconfig CLI documentation: https://docs.k0sproject.io/stable/cli/k0s_kubeconfig/
- k0s troubleshooting documentation: https://docs.k0sproject.io/stable/troubleshooting/
- k0sctl configuration documentation: https://docs.k0sproject.io/stable/k0sctl-install/

## Issues Found
- Flux notification resources used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification API documented for Provider and Alert resources is `notification.toolkit.fluxcd.io/v1beta3`. Updated both apiVersion values.
- The GitHub notification Provider referenced a `github-token` Secret without showing how to create it. Added the `kubectl -n flux-system create secret generic github-token --from-literal=token=...` command required for the Provider to authenticate.
- The notification section claimed alerts would be sent when deployments "fail or succeed", but the shown Alert uses `eventSeverity: error`, which only matches error events. Updated the wording to match the configuration.
- The storage section described local-path-provisioner as a CSI driver. Local path provisioners are storage provisioners, while CSI drivers are a specific Kubernetes storage integration type. Updated the wording to "storage provisioner or CSI driver."
- The k0sctl example pinned `1.30.0+k0s.0`, which is outdated for a guide installing the latest Flux CLI and can fall below current Flux Kubernetes support. Updated the example to `1.35.2+k0s.0`.
- The troubleshooting section used `sudo k0s logs`, which is not a valid k0s CLI command. Replaced it with `sudo journalctl -u k0scontroller` for systemd-based k0s controller logs.

## Review Notes
The Flux bootstrap, Kustomization, HelmRepository, HelmRelease, k0s single-node installation, kubeconfig export, and kubectl examples are consistent with the current official documentation. The example Helm chart versions may need periodic review because chart compatibility changes over time.
