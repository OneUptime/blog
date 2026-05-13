# Validation Summary: How to Configure Community-Tested Kubernetes Networking with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Calico
- Calico FelixConfiguration
- Sonobuoy
- Kubernetes conformance testing

## Sources Consulted
- Sonobuoy CLI documentation for `sonobuoy run`: https://sonobuoy.io/docs/main/cli/sonobuoy_run/
- Sonobuoy overview and getting started documentation: https://sonobuoy.io/docs/main/
- Kubernetes conformance testing overview via Sonobuoy: https://sonobuoy.io/understanding-e2e-tests/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico GitHub repository Makefile: https://github.com/projectcalico/calico/blob/master/Makefile
- Sonobuoy GitHub releases: https://github.com/vmware-tanzu/sonobuoy/releases

## Issues Found
- The heading "Run Kubernetes Network Conformance Tests" implied Sonobuoy certified conformance is network-specific. Sonobuoy's `certified-conformance` mode runs the Kubernetes conformance suite, so the heading was changed to "Run Kubernetes Conformance Tests."
- The Calico e2e command used `make e2e-tests`, but the current Project Calico Makefile exposes `e2e-test` for creating a kind cluster and `e2e-run` for running against an existing cluster. The command was changed to build the e2e binary and run `make e2e-run KUBECONFIG="${KUBECONFIG}"`, matching the surrounding text.
- The FelixConfiguration example used unsupported fields `reportingInterval` and `mtu`. The unsupported usage reporting field was removed, and `mtu` was replaced with the documented `ipipMTU` field for IP-in-IP tunnel MTU configuration.
- The configuration heading and code comment implied an official community recommendation that was not supported by the consulted documentation. They were changed to describe the snippet as an example production configuration.

## Review Notes
The Sonobuoy command sequence is still intentionally simple. For repeatable automation, future updates could pin the Sonobuoy binary to the latest published release at the time of writing and include cleanup with `sonobuoy delete`.
