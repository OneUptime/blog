# Validation Summary: How to Optimize Kubernetes Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico CNI)
- Kubernetes
- Sonobuoy (Kubernetes conformance testing)
- FelixConfiguration (Calico CRD)
- Mermaid (diagram)

## Sources Consulted
- Sonobuoy GitHub releases: https://github.com/vmware-tanzu/sonobuoy/releases
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico GitHub Makefile: https://github.com/projectcalico/calico/blob/master/Makefile
- Calico FelixConfiguration spec (`reportingInterval` field semantics)

## Issues Found
1. **Invalid sonobuoy version (v0.56.0)** — v0.56.0 does not exist in the sonobuoy release history. The earliest visible release in the 0.56.x series is v0.56.12 and the latest release is v0.57.3. Updated both the download URL and the tarball filename to v0.57.3.
2. **Invalid FelixConfiguration field `mtu`** — `mtu` is not a valid field on FelixConfiguration. MTU is set per-overlay via `ipipMTU`, `vxlanMTU`, or `vxlanMTUV6`. Since the comment in the snippet specifically refers to IP-in-IP, changed `mtu: 1480` to `ipipMTU: 1480`.
3. **Wrong Makefile target name (`make e2e-tests`)** — The Calico Makefile defines `e2e-test` (singular), not `e2e-tests`. Updated the command to `make e2e-test`.

## Review Notes
- `reportingInterval: 0s` is valid on FelixConfiguration and disables Felix status reporting into the datastore; note the Calico docs warn this must be non-zero for OpenStack deployments, which is not applicable to a Kubernetes-only post.
- `logSeverityScreen: Warning` and `prometheusMetricsEnabled: true` are both valid FelixConfiguration fields.
- The sonobuoy commands (`run --mode=certified-conformance`, `status`, `retrieve`, `results`) are all valid CLI subcommands.
- The `git clone` URL for Calico (https://github.com/projectcalico/calico.git) is correct.
- The Calico e2e workflow typically requires additional setup (KUBECONFIG, kind cluster, etc.); readers may want to consult the upstream developer docs before running, but the target name itself is now correct.
