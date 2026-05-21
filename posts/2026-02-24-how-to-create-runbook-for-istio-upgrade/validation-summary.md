# Validation Summary: How to Create Runbook for Istio Upgrade

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- Istio sidecar injection and revisions
- Istio gateway upgrades

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio Download the Istio Release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The example target version used Istio 1.24.0, which is no longer supported. Updated the example to Istio 1.30.0 and changed the matching revision from `1-24-0` to `1-30-0`.
- The backup loop claimed to back up all Istio configuration resources but listed only a subset. Replaced it with `kubectl api-resources` calls for the Istio API groups used by current Istio configuration resources.
- The namespace rollout wait commands used `kubectl rollout status deployment --all`, but the documented `kubectl rollout status` syntax does not support `--all`. Replaced those commands with loops over deployment resource names.
- The gateway section said the canary install should create a new gateway deployment. Istio's default profile does not automatically create revision-specific gateway deployments during canary control plane installation, so the text now states that explicitly.
- The gateway in-place upgrade example re-ran `istioctl install` with gateway component settings. Replaced it with a pod-template patch that sets the `istio.io/rev` label for newly rolled gateway pods, then waits for the rollout.
- The old control plane removal example used `istioctl uninstall --revision default`, which is not correct for an unrevised old control plane. Updated the command to use an explicit old revision, with a separate commented example for uninstalling an unrevised install from its original IstioOperator file.
- The post-upgrade certificate check used `istioctl proxy-config secret deploy/<any-pod>`, which mixed a Deployment resource prefix with a pod placeholder. Replaced it with the documented pod identity form, `<pod-name>.<namespace>`.

## Review Notes
- The rollback procedure assumes the old control plane can be selected with `istio-injection=enabled`. If the previous control plane was revisioned, operators should relabel namespaces back to the old revision instead.
- The local environment did not have `kubectl` or `istioctl` installed, so command validation was performed against official generated command references rather than local `--help` output.
