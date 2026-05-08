# Validation Summary: How to Validate Calico Service Account-Based Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico service account selectors
- Kubernetes ServiceAccounts
- kubectl
- calicoctl
- Python 3
- Bash
- netcat

## Sources Consulted
- Calico documentation: Use service accounts rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl validate - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- `calicoctl apply -f "$f" --dry-run` was incorrect. The current Calico `apply` command reference does not list a `--dry-run` option. Changed it to `calicoctl validate -f "$f"`, which is the documented offline validation command for Calico resource files.
- The service account selector extraction assumed `name == '...'`. Calico documents exact ServiceAccount name matching through the automatic `projectcalico.org/name` label for `serviceAccountSelector`. Updated the example to extract exact-name selectors using `projectcalico.org/name == "..."` or `projectcalico.org/name == '...'`.
- The namespace extraction used the first `namespace:` line anywhere in the file, which could pick up an unrelated field. Updated it to read `metadata.namespace` and default to `default` if omitted.
- The warning text said default ServiceAccount pods may "bypass" policies. That wording was too strong: pods using the default ServiceAccount may fail to match the intended service account-based policy selectors. Updated the message accordingly.
- The behavioral test used `nc ... --wait 3` after the host and port. Common netcat implementations use `-w 3` for timeout, and putting the timeout before the destination avoids passing it as an extra remote command argument. Updated the command to `nc -zv -w 3 "$dest_ip" "$port"`.
- The Python script did not check whether `kubectl get pods` succeeded before parsing JSON. Added `check=True` and error handling so CLI failures do not become misleading JSON parsing errors.

## Review Notes
The post is technically relevant and the overall validation approach is sound. The shell example still handles simple exact-name `serviceAccountSelector` cases; policies using arbitrary service account label selectors require label-aware validation rather than a single ServiceAccount existence check.
