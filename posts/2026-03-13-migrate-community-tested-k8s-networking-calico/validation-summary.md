# Validation Summary: How to Migrate to Community-Tested Kubernetes Networking with Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico
- FelixConfiguration
- Sonobuoy
- Kubernetes conformance tests
- Calico end-to-end tests

## Sources Consulted
- Sonobuoy CLI documentation: https://sonobuoy.io/docs/main/cli/sonobuoy_run/
- Sonobuoy overview and getting started documentation: https://sonobuoy.io/docs/main/
- Sonobuoy Kubernetes e2e/conformance explanation: https://sonobuoy.io/understanding-e2e-tests/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Project Calico repository Makefile: https://github.com/projectcalico/calico/blob/master/Makefile
- Project Calico e2e README: https://github.com/projectcalico/calico/blob/master/e2e/README.md

## Issues Found
- The Calico e2e command used `make e2e-tests`, which is not a documented target in the current Calico repository. Updated the example to build the e2e binary from the `e2e` directory and run the documented Calico conformance focus against the user's `KUBECONFIG`.
- The FelixConfiguration snippet used `mtu`, which is not a valid FelixConfiguration field. Replaced it with `ipipMTU`, the documented field for controlling the IP-in-IP tunnel MTU.

## Review Notes
Sonobuoy `--mode=certified-conformance`, `sonobuoy status`, `sonobuoy retrieve`, and `sonobuoy results` are valid documented commands. The Felix metrics field `prometheusMetricsEnabled` is valid and disabled by default unless explicitly enabled.
