# Validation Summary: How to Troubleshoot Community-Tested Kubernetes Networking with Calico

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
- Sonobuoy CLI documentation for `sonobuoy run`, `status`, `retrieve`, and `results`: https://sonobuoy.io/docs/v0.57.3/cli/
- Sonobuoy latest GitHub release metadata and release assets: https://github.com/vmware-tanzu/sonobuoy/releases
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Project Calico GitHub repository and Makefile targets: https://github.com/projectcalico/calico
- Calico v3.26 FelixConfiguration CRD schema: https://raw.githubusercontent.com/projectcalico/calico/release-v3.26/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml

## Issues Found
- The Sonobuoy install example used v0.56.0 even though newer official release assets are available. Updated the example to v0.57.3, the latest published GitHub release asset found during review.
- The section title said "Kubernetes Network Conformance Tests", but `sonobuoy run --mode=certified-conformance` runs Kubernetes certified conformance tests, not a network-only suite. Updated the heading to "Kubernetes Conformance Tests".
- The Calico command `make e2e-tests` is not a valid target in the Calico Makefile. Updated it to `make e2e-test`, which is the documented repository target for the local e2e smoke test.
- The Calico e2e command comment said the tests run against "your cluster", but the corrected portable target creates and uses a local kind cluster. Updated the comment accordingly.
- The FelixConfiguration snippet used `mtu`, which is not a valid FelixConfiguration field for the referenced Calico versions. Replaced it with `ipipMTU`, the documented field for IP-in-IP tunnel MTU.
- The configuration snippet described itself as "community-tested production configuration", which was stronger than the official documentation supports. Changed the comment to "Example production Felix configuration".

## Review Notes
The Felix `reportingInterval: 0s`, `logSeverityScreen: Warning`, and `prometheusMetricsEnabled: true` fields are present in Calico's CRD schema or documentation. `ipipMTU: 1480` is syntactically valid, but MTU values should still be chosen based on the actual underlay and encapsulation mode in a real cluster.
