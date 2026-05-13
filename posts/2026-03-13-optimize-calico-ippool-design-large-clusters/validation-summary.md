# Validation Summary: How to Optimize Calico IPPool Design for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM / IPPool resource (projectcalico.org/v3)
- calicoctl CLI
- Kubernetes / kubectl
- Mermaid (diagram syntax)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- kubectl CLI reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid command and flag.
- `calicoctl ipam show --show-blocks` — valid; `--show-blocks` is a supported flag.
- IPPool manifest is syntactically and semantically valid: `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and the `cidr`, `blockSize`, and `natOutgoing` fields are all correct. `blockSize: 26` is the default for IPv4 and a reasonable value.
- `calicoctl ipam check -o ipam-report.json` — valid; `-o` writes the JSON report to the given file.
- `kubectl get pods -A -o wide` — valid kubectl invocation.

## Review Notes
- The post is intentionally minimal. The title and description promise content about "dedicated pools per availability zone and workload type" and large-cluster optimization, but the body does not actually demonstrate per-AZ or per-workload pools (e.g., via `nodeSelector` on the IPPool, or multi-pool topology). This is a content-depth gap rather than a technical inaccuracy, so no edits were made.
- The example pool does not set `ipipMode` / `vxlanMode`; in many installations these are set explicitly. The defaults (`Never`) are valid, so this is not an error — just worth noting if the post is later expanded.
- `blockSize: 26` yields 64 addresses per block, which is fine for typical workloads. For very dense nodes or very sparse clusters, operators should pick a different size; the post could call this out in a future revision.
- All referenced versions and APIs are current as of the validation date.
