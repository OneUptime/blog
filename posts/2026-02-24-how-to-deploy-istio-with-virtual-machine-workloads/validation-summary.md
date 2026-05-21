# Validation Summary: How to Deploy Istio with Virtual Machine Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio virtual machine workloads
- WorkloadGroup and WorkloadEntry
- East-west gateways
- Envoy sidecars and istio-agent
- Istio AuthorizationPolicy

## Sources Consulted
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio Virtual Machine Architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/

## Issues Found
- The IstioOperator example used `--autoregister` later but did not enable the required Pilot auto-registration and health-check feature flags. I added `PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION` and `PILOT_ENABLE_WORKLOAD_ENTRY_HEALTHCHECKS` under `values.pilot.env`.
- Several Istio networking resources used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for Gateway, WorkloadGroup, and WorkloadEntry, so I updated those snippets.
- The WorkloadGroup readiness probe used `httpGet` against MySQL port 3306. That is not a valid HTTP readiness check for MySQL, so I changed it to a TCP probe.
- The Debian VM setup downloaded Istio sidecar version `1.20.0`, which is outdated relative to the current Istio documentation. I updated the example to `1.30.0`.
- The VM setup copied generated files but omitted adding the generated `hosts` file contents to `/etc/hosts`, which the official guide requires for the VM proxy to reach Istiod during bootstrap. I added that command.
- The VM file ownership setup omitted `/etc/istio/proxy`, which the official guide creates and assigns to `istio-proxy`. I added the directory creation and included it in the ownership command.
- The east-west gateway install command omitted `-y`, which is used in Istio's official non-interactive examples. I added it so the command works cleanly in scripted tutorial use.

## Review Notes
- `istioctl` was not installed in the local environment, so CLI flag validation was performed against official Istio command documentation rather than local `--help` output.
- Istio's VM auto-registration and WorkloadEntry health-check features are still described by the official guide as alpha / expert-user functionality. The post now enables the required flags, but production users should evaluate that feature status before relying on auto-registration.
