# Validation Summary: How to Test Kubernetes Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API, FelixConfiguration resource)
- Kubernetes networking / CNI
- Sonobuoy (CNCF conformance testing tool)
- IP-in-IP overlay networking
- Prometheus metrics
- Mermaid diagrams

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- FelixConfiguration CRD source: https://github.com/projectcalico/calico/blob/master/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml
- projectcalico/calico Makefile: https://github.com/projectcalico/calico/blob/master/Makefile
- Sonobuoy v0.56.0 release: https://github.com/vmware-tanzu/sonobuoy/releases/tag/v0.56.0
- Sonobuoy v0.56.0 FAQ: https://sonobuoy.io/docs/v0.56.0/faq/
- CNCF k8s-conformance submission instructions: https://github.com/cncf/k8s-conformance/blob/master/instructions.md

## Issues Found
1. **Invalid FelixConfiguration field `mtu`** — The example used `mtu: 1480`, but FelixConfiguration has no top-level `mtu` field. Per the Calico CRD and docs, valid MTU fields are `ipipMTU`, `vxlanMTU`, `vxlanMTUV6`, `wireguardMTU`, and `wireguardMTUV6`. Since the inline comment described the value as a "Conservative MTU for IP-in-IP", I changed the field to `ipipMTU: 1480`, which matches the stated intent.
2. **Wrong make target `e2e-tests`** — The post instructed users to run `make e2e-tests` in the Calico repo, but the actual target in projectcalico/calico's root Makefile is `e2e-test` (singular). Updated the command to `make e2e-test`.

## Review Notes
- The Sonobuoy release URL, archive name, and `--mode=certified-conformance` flag are all valid for v0.56.0.
- `logSeverityScreen: Warning`, `prometheusMetricsEnabled: true`, and `reportingInterval: 0s` are valid FelixConfiguration values. Note: `0s` for `reportingInterval` explicitly disables status reports — this is acceptable on Kubernetes but is documented as disallowed for OpenStack deployments. Not flagged in the post since the post is Kubernetes-scoped.
- Calico v3.26 (May 2023) is an older minimum version; current Calico releases are significantly newer, but stating a minimum version is reasonable.
- The Calico repo monorepo also exposes more granular e2e targets (e.g., `e2e-test-clusternetworkpolicy`, `e2e-run`); the post's single `e2e-test` invocation is the simplest correct entry point.
