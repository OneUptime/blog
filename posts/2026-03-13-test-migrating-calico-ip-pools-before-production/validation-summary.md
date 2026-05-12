# Validation Summary: How to Test Migrating Calico IP Pools Before Production

## Status
validated

## Post Type
Tutorial / Guide (brief reference)

## Technologies Covered
- Calico (Project Calico)
- Calico IPAM (IP Address Management)
- IP Pools (`projectcalico.org/v3` `IPPool` resource)
- calicoctl CLI
- kubectl
- Kubernetes

## Sources Consulted
- Calico IP Pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl IPAM commands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl `ipam check`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl `ipam show`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid syntax for listing IP pools.
- `calicoctl ipam show --show-blocks` — valid flag combination; shows IPAM blocks in addition to summary.
- IPPool YAML uses the correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and valid `spec` fields (`cidr`, `blockSize`, `natOutgoing`). A `blockSize` of 26 is the IPv4 default and is valid for a /16 CIDR.
- `calicoctl ipam check -o ipam-report.json` — the `-o` flag writes the IPAM report to the specified file, which is correct.
- `kubectl get pods -A -o wide` — valid kubectl invocation that shows pod IPs across all namespaces.

## Review Notes
- The post is very brief and the body does not actually walk through a migration procedure (e.g., creating a new pool, disabling the old pool with `disabled: true`, draining/recreating pods to reassign IPs). The commands shown are appropriate building blocks for staging-cluster validation but stop short of demonstrating an end-to-end migration. This is a content-depth observation, not a technical error.
- Calico v3.20+ is a reasonable lower bound; the IPPool fields and `calicoctl ipam check` output-file flag have been stable across recent v3.x releases.
