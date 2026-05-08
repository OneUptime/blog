# Validation Summary: How to Use calicoctl validate with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico NetworkPolicy and GlobalNetworkPolicy resources
- Calico GlobalNetworkSet, IPPool, FelixConfiguration, and BGPPeer resources
- Kubernetes GitHub Actions CI workflows
- Bash scripting

## Sources Consulted
- Calico Open Source documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source documentation: Global network policy, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: Network policy, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Global network set, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico Open Source documentation: IP pool, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: BGP peer, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Official Project Calico release binaries for calicoctl v3.27.0, v3.30.0, v3.31.0, v3.31.5, and v3.32.0, https://github.com/projectcalico/calico/releases

## Issues Found
- The prerequisite and GitHub Actions example used calicoctl v3.27.0, but `calicoctl validate` is not available in v3.27.0 or v3.30.0. Updated the post to require v3.31 or later and changed the CI install URL to v3.31.0.
- The expected successful validation output for a GlobalNetworkPolicy did not match the current CLI output. Updated it to `Successfully validated 1 'GlobalNetworkPolicy' resource(s)`.
- The example validation error comments for invalid action and invalid selector did not match the CLI's actual error shape. Updated them to representative current errors.
- The missing-field example claimed a GlobalNetworkPolicy without `spec.selector` may validate and that NetworkPolicy requires a namespace. Calico defaults `selector` to `all()`, and NetworkPolicy `metadata.namespace` defaults to `default`; changed the example to omit `metadata.name`, which is required.
- The multi-resource GlobalNetworkSet example used `global()` inside an EntityRule `selector`, but Calico only permits `global()` in an EntityRule `namespaceSelector`. Added a label to the GlobalNetworkSet and selected it with `role == "trusted"`.
- The Bash directory validation script and GitHub Actions loop incremented counters inside a pipeline subshell, so the final counts/status could remain zero. Rewrote both loops to use process substitution.
- The Bash directory validation script ran a failing `calicoctl validate | sed` pipeline under `set -euo pipefail`, which could exit before incrementing `FAIL`. Added `|| true` after the diagnostic pipeline.

## Review Notes
- The current `calicoctl validate` command can validate a directory directly and supports `--recursive`, but the post's custom file loop is still valid after the subshell fix.
- All YAML resource examples remaining in the post were checked with calicoctl v3.32.0.
