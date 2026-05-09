# Validation Summary: How to Troubleshoot Calico IPAM Release Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes IPAM
- kubectl
- Bash

## Sources Consulted
- Calico Open Source 3.32 documentation: calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source 3.32 documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source 3.32 documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 documentation: Configure calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes API reference: Pod status podIP and podIPs fields: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The post-release verification command used `calicoctl ipam show | grep "${IP}"`, but `calicoctl ipam show` without `--ip` prints overall IP pool usage and may not list the individual address. Changed it to `calicoctl ipam show --ip="${IP}"`, which the Calico docs define as the command for reporting whether a specific IP address is in use.
- The IP verification examples used broad `grep` checks against human-readable `kubectl get` output. This can match substrings or unrelated columns. Changed the examples to query pod IPs and endpoint addresses with Kubernetes JSONPath and use `grep -Fx` for exact IP matches.
- The loop used `grep -c "${ip}" || echo 0` inside command substitution. When `grep -c` finds no matches, it still prints `0` and exits non-zero, so the fallback can produce duplicate output and break the numeric comparison. Changed the loop to use `grep -Fxq` directly in the `if` condition.

## Review Notes
The Calico commands used in the post are current in the Calico Open Source 3.32 documentation. Calico's release documentation explicitly notes that releasing an IP does not remove it from an endpoint that is still using it, so the post's warning to verify before release is technically sound.
