# Validation Summary: How to Validate Calico Cluster Diagnostics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico Enterprise calicoctl IPAM diagnostics
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico TigeraStatus installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Calico Enterprise calicoctl ipam check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The description mentioned policy enforcement, but the post does not include a policy enforcement validation. I changed it to list the actual checks shown in the post.
- The introduction mentioned policy count mismatches between kube-controllers and calicoctl, which is not validated later in the post and is not supported by the cited Calico troubleshooting workflow. I replaced it with unavailable operator-managed components, which matches the TigeraStatus check.
- The calico-system pod check used `grep -cv "Running" || echo 0`. When all pods are Running, `grep -c` prints `0` but exits nonzero because no nonmatching lines were selected, causing command substitution to contain two zero lines and breaking the numeric comparison. I changed the check to use `awk` against the Kubernetes status column and to fail explicitly if the pod query fails.
- The TigeraStatus check treated a failed `kubectl get tigerastatus` command as zero unavailable components because stderr was discarded and the empty output was counted as zero. I changed it to fail explicitly when TigeraStatus resources cannot be queried.
- The IPAM consistency check parsed a specific success string. The official `calicoctl ipam check` documentation defines the command behavior and options but does not require scripts to depend on that exact text, so I changed the script to use the command exit status.
- The IPAM utilization check selected the first percentage anywhere in `calicoctl ipam show` output. The official output includes percentages in both `IPS IN USE` and `IPS FREE`; I changed the parser to read the `IPS IN USE` column for IP Pool rows and report a warning if utilization cannot be determined.
- The cross-node routing example read the second pod IP immediately after creating pods. I added `kubectl wait --for=condition=Ready` for both pods before retrieving the target pod IP and running `kubectl exec`.

## Review Notes
The post is primarily accurate for operator-managed Calico installations using the `calico-system` namespace. Calico documentation notes that manifest-based installations use `kube-system` for equivalent component checks, so future revisions could call out that namespace difference explicitly.
