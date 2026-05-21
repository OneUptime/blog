# Validation Summary: How to Enable Debug Logging for Istiod

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Istiod / pilot-discovery
- Istio ControlZ
- istioctl
- IstioOperator
- Kubernetes kubectl logs

## Sources Consulted
- Istio Component Logging: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio istioctl reference, including `istioctl admin log`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio installation customization guide: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio discovery chart template showing `values.global.logging.level` rendering to `--log_output_level`: https://github.com/istio/istio/blob/release-1.30/manifests/charts/istio-control/istio-discovery/templates/deployment.yaml
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The runtime examples used `kubectl exec ... curl localhost:8080/scopej/...`. Current Istio documentation describes `istioctl admin log` as the supported command for retrieving and updating Istiod logging levels, using ControlZ. I replaced the runtime examples with `istioctl admin log --level ...` commands.
- The post claimed Istiod exposes the relevant admin API on port `8080`. Official ControlZ documentation shows Istiod ControlZ on port `9876`, and `istioctl admin log` defaults to that ControlZ port. I removed the incorrect port-specific instructions and used the documented CLI.
- The "enable debug for everything" example set only the `default` scope. I changed it to `all:debug`, which matches the current pilot-discovery scope list.
- The startup `IstioOperator` examples used `components.pilot.k8s.env` with `PILOT_LOG_LEVEL`. The current Istio chart renders `values.global.logging.level` to the `--log_output_level` argument, and official installation customization examples use `values.global.logging.level`. I changed the startup snippets to use that path.
- The listed scope names included outdated or non-pilot-discovery scopes such as `grpcAdapter` and `tpath`. I updated the list to use current pilot-discovery scopes such as `grpc`, `kube`, `fullpush`, and `ca`.
- The certificate troubleshooting example mentioned the `ca` scope but only enabled the `default` scope. I changed the example to enable `ca:debug` and noted related certificate/security scopes.
- The authorization troubleshooting description said policies are evaluated by Istiod. Istiod processes and pushes authorization policy configuration, while enforcement happens in the data plane. I corrected the wording.
- The stack trace example used direct JSON against `/scopej`. I replaced it with the documented `istioctl admin log --stack-trace-level` option.
- The reset instructions suggested restarting Istiod to reset runtime levels. I changed this to `istioctl admin log --log-reset`, which is the documented reset operation.

## Review Notes
The remaining `kubectl logs` examples are syntactically valid, including `-f` and `--since=1m`. The exact useful scope for a troubleshooting case can vary by Istio version and issue, so operators should confirm available scopes with `istioctl admin log` on their installed control plane.
