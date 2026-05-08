# Validation Summary: Validating Results After Running calicoctl ipam check

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico Open Source documentation: `calicoctl ipam check` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: `calicoctl ipam release` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Kubernetes documentation: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: `kubectl get` reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: StatefulSet Basics, https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/

## Issues Found
- The validation script used `grep -cE "leaked|orphan" || echo 0`. Because `grep -c` prints `0` and exits with status 1 when there are no matches, this can set the variable to a multiline `0` value and break numeric comparisons. Changed both issue-count assignments to use `|| true`.
- The troubleshooting note said StatefulSet pods maintain IP affinity. Kubernetes documents stable StatefulSet hostnames and DNS identities, but pod IP addresses may change when pods are recreated. Updated the note to describe stable names/DNS identities and possible IP changes.

## Review Notes
The post's `calicoctl ipam check` usage is consistent with current Calico documentation. The `kubectl get pods --all-namespaces --field-selector=status.phase=Running -o wide` command uses a supported pod field selector and current `kubectl get` flags.
