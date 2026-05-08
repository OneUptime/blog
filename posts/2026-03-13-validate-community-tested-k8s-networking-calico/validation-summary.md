# Validation Summary: How to Validate Community-Tested Kubernetes Networking with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Calico
- Sonobuoy
- FelixConfiguration
- Make
- YAML

## Sources Consulted
- Sonobuoy CLI documentation: https://sonobuoy.io/docs/main/cli/sonobuoy/
- Sonobuoy run command documentation: https://sonobuoy.io/docs/v0.56.8/cli/sonobuoy_run/
- Sonobuoy GitHub releases API: https://api.github.com/repos/vmware-tanzu/sonobuoy/releases/latest
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Project Calico repository Makefile: https://raw.githubusercontent.com/projectcalico/calico/master/Makefile

## Issues Found
- The Sonobuoy install commands used v0.56.0, while the current official GitHub release is v0.57.3. Updated the download URL and tarball name to v0.57.3.
- The section title described "Kubernetes Network Conformance Tests", but Sonobuoy's certified conformance mode runs the Kubernetes conformance suite, not a network-only suite. Updated the heading to "Kubernetes Conformance Tests".
- The Calico e2e command used `make e2e-tests`, which is not a target in the current Project Calico Makefile. Replaced it with `make -C e2e build` followed by `make e2e-run KUBECONFIG=$KUBECONFIG`, matching the repository's current targets for running e2e tests against an existing cluster.
- The FelixConfiguration snippet used invalid fields `reportingInterval` and `mtu`. Updated them to the documented `usageReportingInterval` and `ipipMTU` fields.

## Review Notes
- The `ipipMTU: 1480` value is syntactically valid, but MTU values are environment-specific. Calico can auto-detect tunnel MTU when the field is unset.
