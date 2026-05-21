# Validation Summary: How to Use istioctl Reference Commands Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Envoy proxy configuration
- Istio ambient mode

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Using the istioctl command-line tool: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Check-Inject diagnostic docs: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio Install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Installation Configuration Profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Reporting Bugs: https://istio.io/latest/docs/releases/bugs/

## Issues Found
- Replaced `istioctl dashboard controlz deployment/istiod -n istio-system` with `istioctl dashboard istiod-debug deployment/istiod.istio-system`, because the current istioctl dashboard command reference documents `istiod-debug` rather than a `controlz` dashboard command.
- Changed the namespace-only `istioctl x check-inject -n <namespace>` example to use label pairs, because the official check-inject examples require a pod, deployment, or `-l <label-key>=<label-value>` selector.
- Replaced `istioctl proxy-config all <ztunnel-pod> -n istio-system -o json` with `istioctl ztunnel-config all <ztunnel-pod> -n istio-system -o json`, because ztunnel inspection uses the `ztunnel-config` command group in current Istio.
- Replaced `istioctl x waypoint status -n <namespace>` with `istioctl waypoint status -n <namespace>`, because waypoint commands are documented under the top-level `waypoint` command group.
- Removed outdated `istioctl profile list`, `istioctl profile dump`, `istioctl profile diff`, and `istioctl verify-install` examples. Replaced them with current `istioctl install --set profile=demo --skip-confirmation`, `istioctl manifest generate --set profile=demo`, and `istioctl install --set profile=demo --verify` examples.

## Review Notes
The post is a practical command reference and remains technically relevant. The version output example uses Istio 1.22.0 as an example only; Istio 1.22 is no longer a current supported version, but the surrounding guidance to align `istioctl`, control plane, and data plane versions is still correct.
