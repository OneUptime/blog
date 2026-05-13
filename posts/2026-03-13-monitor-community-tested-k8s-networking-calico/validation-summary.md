# Validation Summary: How to Monitor Community-Tested Kubernetes Networking with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico FelixConfiguration
- Sonobuoy
- Prometheus metrics
- Make
- YAML
- Mermaid

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Sonobuoy v0.57.3 CLI documentation for `sonobuoy run`: https://sonobuoy.io/docs/v0.57.3/cli/sonobuoy_run/
- Sonobuoy v0.57.3 CLI documentation for `sonobuoy retrieve`: https://sonobuoy.io/docs/v0.57.3/cli/sonobuoy_retrieve/
- Sonobuoy v0.57.3 CLI documentation for `sonobuoy results`: https://sonobuoy.io/docs/v0.57.3/cli/sonobuoy_results/
- Sonobuoy v0.57.3 overview and installation docs: https://sonobuoy.io/docs/v0.57.3/
- Project Calico repository Makefile: https://raw.githubusercontent.com/projectcalico/calico/master/Makefile

## Issues Found
- The Sonobuoy install example pinned `v0.56.0`, which is older than the current documented Sonobuoy release line reviewed. Updated the download URL and tarball name to `v0.57.3`.
- The Calico e2e example used `make e2e-tests`, but the current Calico Makefile exposes `e2e-test` for a local kind cluster and `e2e-run` for an existing cluster. Changed the example to build the e2e binary and run `make e2e-run KUBECONFIG="$KUBECONFIG"` for the cluster described by the current kubeconfig.
- The FelixConfiguration example used `mtu`, which is not the documented FelixConfiguration field for an IP-in-IP tunnel MTU. Replaced it with `ipipMTU`, matching the Calico FelixConfiguration resource reference.

## Review Notes
- The Sonobuoy `run`, `status`, `retrieve`, and `results` command flow is valid. `--mode=certified-conformance` remains a documented run mode.
- `prometheusMetricsEnabled`, `logSeverityScreen`, and `reportingInterval` are valid Calico FelixConfiguration fields in the current CRD/reference material reviewed.
- Calico documentation notes that MTU is auto-detected by default; explicitly setting `ipipMTU` can still be valid when the operator wants a fixed value for IP-in-IP deployments.
