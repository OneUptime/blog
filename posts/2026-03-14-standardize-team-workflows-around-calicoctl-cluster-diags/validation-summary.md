# Validation Summary: Standardizing Team Workflows Around calicoctl cluster diags

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Bash
- JSON

## Sources Consulted
- Calico official `calicoctl cluster diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico official `calicoctl version` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes official `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The collection script moved `calico-cluster-diags-*.tar.gz`, but current Calico documentation shows `calicoctl cluster diags` writes `calico-diagnostics.tar.gz`. Updated the script to move the documented output filename and to stop if collection fails.
- The archive listing loop used command substitution over `ls`, which can split paths containing whitespace. Updated it to iterate over the quoted glob directly.
- The Python metadata reader interpolated the metadata path into Python source, which could break on paths containing quotes. Updated it to pass the path as an argument.
- The cleanup command placed `-maxdepth` after another expression term. Reordered it before the name and age predicates to match `find` option usage.

## Review Notes
The Calico pod listing uses the `calico-system` namespace, which is correct for common operator-managed Calico installations. Some manifest-based installations use `kube-system`, so teams may need to adjust the namespace in their local script.
