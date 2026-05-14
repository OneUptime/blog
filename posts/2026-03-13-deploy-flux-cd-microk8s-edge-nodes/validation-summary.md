# Validation Summary: How to Deploy Flux CD on MicroK8s Edge Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Flux CD
- Kubernetes
- Snap
- containerd registry configuration
- Kubernetes PersistentVolumeClaims and StorageClasses
- Flux Kustomization, Alert, and Provider resources

## Sources Consulted
- MicroK8s getting started documentation: https://canonical.com/microk8s/docs/getting-started
- MicroK8s snap channel documentation: https://canonical.com/microk8s/docs/setting-snap-channel
- MicroK8s built-in registry documentation: https://canonical.com/microk8s/docs/registry-built-in
- MicroK8s private registry documentation: https://canonical.com/microk8s/docs/registry-private
- MicroK8s hostpath storage addon documentation: https://microk8s.io/docs/addon-hostpath-storage
- MicroK8s snap refresh documentation: https://canonical.com/microk8s/docs/snap-refreshes
- Snap update management documentation: https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/

## Issues Found
- The MicroK8s install command used the older `1.29/stable` channel. Updated examples to `1.35/stable`, which is the current stable MicroK8s channel available on May 14, 2026.
- The user setup commands attempted to `chown` `~/.kube` before ensuring the directory exists. Replaced this with the current MicroK8s documentation pattern using `mkdir -p ~/.kube` and `chmod 0700 ~/.kube`.
- The registry section described the built-in registry as a transparent cache and used a `containerd-template.toml` mirror edit that is not the current MicroK8s 1.23+ registry configuration pattern. Rewrote the section to tag and push images to `localhost:32000`, matching the built-in registry behavior.
- The Flux bootstrap command used `--token-env=GITHUB_TOKEN`, which is not a current `flux bootstrap github` option. Removed it because Flux reads `GITHUB_TOKEN` from the environment automatically.
- The Flux bootstrap command installed only source and kustomize controllers, but the later alert examples require the notification controller CRDs and controller. Added `notification-controller` to the component list.
- The snap refresh timer command incorrectly used `snap set microk8s refresh.timer=...`; snap refresh scheduling is a system option. Changed it to `snap set system refresh.timer=mon,04:00`.
- The Flux Alert and Provider snippets used `notification.toolkit.fluxcd.io/v1`, but current Flux notification Alert and Provider examples use `v1beta3`; the v1 reference currently covers Receiver. Updated both resources to `v1beta3`.
- The Flux Alert used `eventSeverity: warning`, but Flux supports `info` and `error`. Changed it to `error`.
- The Flux Alert comments claimed it monitored MicroK8s/Kubernetes version changes, but the manifest actually selects Flux Kustomization events. Updated the comments to describe reconciliation error alerts.
- The best practice recommending `--channel=LTS/stable` referenced a channel that is not present in current MicroK8s snap channel listings. Replaced it with a versioned stable channel recommendation.

## Review Notes
The guide is now technically valid for a MicroK8s 1.35 stable installation with Flux bootstrapped from GitHub. The local registry guidance assumes Docker is available on the machine used to build and push images; future revisions could also show non-Docker image tooling for minimal edge hosts.
