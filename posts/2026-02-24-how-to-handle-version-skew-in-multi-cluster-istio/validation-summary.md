# Validation Summary: How to Handle Version Skew in Multi-Cluster Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio multi-cluster deployments
- Kubernetes
- istioctl
- kubectl
- Prometheus/PromQL

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Installation Configuration Profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Install Multicluster: https://istio.io/latest/docs/setup/install/multicluster/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The version skew policy was described as generic one-minor skew between control plane and data plane. Istio's official policy is asymmetric: the control plane may be one version ahead of the data plane, but the data plane cannot be ahead of the control plane. Updated the wording to reflect that.
- The post claimed Istio supports one version of skew between control planes in different clusters. The official supported-releases page documents control-plane/data-plane skew, not a separate control-plane-to-control-plane skew guarantee. Updated the multi-cluster wording to apply the official per-cluster control-plane/data-plane rule.
- The automated version checking script treated any two unique versions as acceptable, which would incorrectly allow versions such as 1.20 and 1.22. Updated the script to parse major/minor versions numerically and alert when the range exceeds one minor version.
- The feature-gates section used `istioctl profile dump --context=cluster-a`, which implies the command inspects cluster-specific feature availability. Profile dumping renders install profile defaults for the Istio release used by the local `istioctl` binary. Updated the text and command accordingly.
- The rollback example for in-place upgrades used `istioctl install` with `--set tag=1.21.0`, which is not the documented downgrade workflow. Updated it to use `istioctl upgrade` with the `istioctl` binary for the target version.
- The best-practices section said never to skip more than one minor version for all upgrades. Istio's docs require one-minor steps for in-place upgrades, while revision-based canary upgrades can jump across two minor versions. Updated the wording to distinguish these cases.

## Review Notes
The command examples for revision labels, namespace relabeling, rollout restarts, canary uninstall, proxy log configuration, and standard Istio request metrics are consistent with the official documentation. `istioctl` and `kubectl` were not installed in the local environment, so CLI verification was performed against official command references rather than local `--help` output.
