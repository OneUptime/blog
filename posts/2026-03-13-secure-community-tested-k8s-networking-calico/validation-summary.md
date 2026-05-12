# Validation Summary: How to Secure Community-Tested Kubernetes Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Sonobuoy (conformance testing)
- FelixConfiguration (projectcalico.org/v3)
- Mermaid (diagram syntax)

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Makefile (master): https://github.com/projectcalico/calico/blob/master/Makefile
- Sonobuoy v0.56.0 docs: https://sonobuoy.io/docs/v0.56.0/
- Sonobuoy v0.56.0 release: https://github.com/vmware-tanzu/sonobuoy/releases/tag/v0.56.0
- CNCF k8s-conformance instructions: https://github.com/cncf/k8s-conformance/blob/master/instructions.md

## Issues Found
1. **Invalid FelixConfiguration field `mtu`**: The FelixConfiguration spec does not have a top-level `mtu` field. Since the comment indicates this is for IP-in-IP encapsulation, changed to `ipipMTU: 1480`, which is the correct field name per the Calico FelixConfiguration reference (other options are `vxlanMTU`, `vxlanMTUV6`, `wireguardMTU`).
2. **Invalid FelixConfiguration field `reportingInterval`**: This field name does not exist in the FelixConfiguration spec. The correct field is `usageReportingInterval`. Updated accordingly.
3. **Incorrect Makefile target `make e2e-tests`**: The Calico repository Makefile defines the singular `e2e-test` target ("Create a kind cluster and run the conformance e2e tests."), not `e2e-tests`. Updated to `make e2e-test`.

## Review Notes
- The sonobuoy v0.56.0 download URL and CLI commands (`run --mode=certified-conformance`, `status`, `retrieve`, `results`) are valid and verified.
- Sonobuoy v0.56.0 was released January 2023; newer versions exist (e.g., v0.57.x). The pinned version still works but readers running newer Kubernetes minor releases may want to use a Sonobuoy version aligned with their cluster version.
- The Calico `make e2e-test` target spins up a kind cluster; to run e2e tests against an existing cluster the appropriate target is `make e2e-run` with `$KUBECONFIG` set. This caveat is not covered in the post but does not represent a technical error in the existing instructions.
- `logSeverityScreen: Warning` and `prometheusMetricsEnabled: true` are valid FelixConfiguration fields and used correctly.
