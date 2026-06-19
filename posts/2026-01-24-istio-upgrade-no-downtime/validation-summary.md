# Validation Summary: How to Upgrade Istio Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- Istio sidecar injection
- Istio ingress gateways
- Prometheus metrics
- PodDisruptionBudget

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The `istioctl analyze --use-kube=false --recursive configs/` command used the removed `--recursive` flag. Istio now documents recursive directory processing as hardcoded, so the command was changed to `istioctl analyze --use-kube=false configs/`.
- The post described `--set revision=1-20` as a revision tag. Istio distinguishes revision names from revision tags, so the wording was changed to "revision name."
- The metric `pilot_xds_push_errors` was not present in current Istio control-plane metrics documentation. It was replaced with `pilot_total_xds_internal_errors`, which is documented for XDS internal errors.
- The gateway upgrade example installed a separate gateway with `istioctl install` and suggested shifting traffic by changing an Istio `Gateway` selector. Istio's gateway documentation describes gateway canaries as separate gateway deployments selected by the same Service, with traffic distribution controlled by deployment replica counts or an external load balancer. The example was changed to a revision-labeled gateway deployment and scaling commands.
- The cleanup section suggested `istioctl uninstall --revision default -y` for the old default control plane. Istio's canary upgrade documentation says non-revisioned old control planes should be uninstalled with their original install options, while revisioned old control planes can use `--revision`. The commands were corrected accordingly.

## Review Notes
The post is technically relevant and the corrected flow matches Istio's documented canary upgrade process. The examples are version-specific to Istio 1.19 to 1.20; future updates should refresh the version numbers and check Istio release notes for any upgrade-specific breaking changes.
