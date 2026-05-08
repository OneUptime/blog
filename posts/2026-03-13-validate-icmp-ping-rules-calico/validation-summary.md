# Validation Summary: How to Validate ICMP and Ping Rules Before Production in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico `GlobalNetworkPolicy` and `NetworkPolicy`
- Calico `calicoctl`
- Kubernetes pods, namespaces, and label selectors
- ICMP and ICMPv6 policy rules
- GitHub Actions
- YAML and Python

## Sources Consulted
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `NetworkPolicy` resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico ICMP/ping policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico `calicoctl` configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico v3.26.5 and v3.31.5 `calicoctl --help` output from official GitHub release binaries: https://github.com/projectcalico/calico/releases
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- GitHub `actions/checkout` repository: https://github.com/actions/checkout

## Issues Found
- The schema validation example used `calicoctl apply -f "$f" --dry-run`, but the official `calicoctl apply` command does not document a `--dry-run` flag. Replaced it with `calicoctl validate -f "$f"`, which is the documented offline validation command for Calico resource files.
- The prerequisites listed Calico v3.26+, but the official v3.26.5 `calicoctl` binary does not include the `validate` subcommand. Updated the prerequisite and CI download to Calico v3.31+, where `calicoctl validate` is available.
- The selector validation script converted `role == 'database'` into a Kubernetes label query for only the key `role`, which could incorrectly pass when pods had `role` with a different value. Updated the script to convert simple Calico equality selectors to Kubernetes `key=value` selectors.
- The selector validation script queried all namespaces for every policy. Updated it to query the policy namespace for namespaced Calico `NetworkPolicy` resources and all namespaces for other policy kinds such as `GlobalNetworkPolicy`.
- The selector validation script treated any non-empty `kubectl get` output as a match. Updated it to request `-o name`, check command failures, and only treat actual resource names as matches.
- The CI/CD example ran `yamllint` without installing it and did not run Calico-specific validation. Added installation of `yamllint` and `calicoctl`, updated `actions/checkout` to a current major version, and added `calicoctl validate -f "$f"`.

## Review Notes
The selector validation script now handles simple `label == 'value'` Calico selectors. More complex Calico selector expressions such as `has(label)`, `in { ... }`, boolean expressions, and selectors that intentionally target host endpoints or network sets still need a richer validator or manual review.
