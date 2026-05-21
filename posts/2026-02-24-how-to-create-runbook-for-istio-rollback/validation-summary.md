# Validation Summary: How to Create Runbook for Istio Rollback

## Status
validated

## Post Type
Technical runbook / operations guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- Argo CD
- Prometheus

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio In-place Upgrades and Downgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Download the Istio release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The canary rollback commands defined `OLD_REVISION` but did not use it. They removed the `istio.io/rev` label and set `istio-injection=enabled`, which only rolls back correctly for a non-revisioned/default injection setup and is wrong for revision-based rollback. Changed the examples to set `istio.io/rev=$OLD_REVISION`, remove `istio-injection`, and use `--overwrite`.
- The canary rollback script had the same issue and did not define `OLD_REVISION`. Added `OLD_REVISION` and changed the namespace relabeling command to point back to the old revision.
- The in-place rollback section used `istioctl install` as the primary rollback command. Istio documents `istioctl upgrade` as the in-place upgrade command and says it can also perform downgrades when run with the target older `istioctl` version. Changed the commands to `istioctl upgrade`.
- The emergency removal commands assumed fixed mutating webhook names and would fail if a webhook was already absent. Added `--ignore-not-found` and included a placeholder for revision-specific injector webhooks.
- The emergency workload restart only covered namespaces labeled `istio-injection=enabled`, missing revision-labeled namespaces. Added a second restart command for namespaces with `istio.io/rev`.

## Review Notes
- The runbook focuses on Deployments. Clusters with StatefulSets, DaemonSets, Jobs, or custom workload controllers need equivalent restart or recreate procedures.
- The example Istio versions are illustrative. Operators should substitute versions that are supported for their cluster and should follow Istio's one-minor-version downgrade guidance for in-place downgrades.
