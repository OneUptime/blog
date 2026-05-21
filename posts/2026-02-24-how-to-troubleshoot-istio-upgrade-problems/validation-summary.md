# Validation Summary: How to Troubleshoot Istio Upgrade Problems

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Helm
- Envoy sidecars
- Istio revision-based upgrades
- Istio mutual TLS

## Sources Consulted
- Istio upgrade overview: https://istio.io/latest/docs/setup/upgrade/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio supported releases and control plane/data plane skew documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio gateway installation and upgrade guidance: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The pre-upgrade check comments stated that only one minor-version jump is supported. Updated this to distinguish in-place upgrades, which require moving one minor version at a time, from revision-based canary upgrades, which Istio documents as supporting a jump across two minor versions.
- The version skew section described support as any one-minor-version difference. Updated it to match Istio's directional support: the control plane can be one minor version ahead of the data plane, but the data plane must not be ahead of the control plane.
- The command for finding old sidecars used `istioctl version --short | head -1`, which can select the client version rather than the intended proxy version. Replaced it with an explicit expected version comparison against the `istioctl proxy-status` version column.
- The gradual rollout script attempted to pipe Kubernetes JSONPath map output into `jq`, which would not be valid JSON. Changed the deployment lookup to request JSON and then use `jq` on `.spec.selector.matchLabels`.
- The webhook inspection command hard-coded `istio-sidecar-injector`, which is not valid for revision-specific injector webhook names. Changed it to use the webhook name discovered from the preceding listing command.
- The post-upgrade mTLS validation used `istioctl authn tls-check`, which is no longer present in the current `istioctl` command reference. Replaced it with `istioctl proxy-config secret <pod-name>.production` to verify workload certificates on the proxy, followed by the existing service-to-service test.
- The istioctl rollback example used `istioctl install --set tag=<previous-version>`, which is not the documented downgrade flow. Replaced it with `istioctl upgrade --set profile=default` and clarified that it must be run with the `istioctl` binary for the target version.

## Review Notes
The local environment did not include `kubectl` or `istioctl`, so CLI validation was performed against official command references rather than local help output. The examples remain intentionally generic and require operators to substitute real revision names, namespaces, pod names, release names, and expected versions.
