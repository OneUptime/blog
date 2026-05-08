# Validation Summary: Rolling Back Safely After Using calicoctl ipam configure

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
- Python

## Sources Consulted
- Calico documentation: calicoctl ipam configure, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico documentation: IPAMConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico Enterprise documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Kubernetes documentation: Field selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The stuck-pod cleanup snippet only printed `kubectl delete pod` commands instead of executing them, even though the surrounding text said to restart stuck pods. Updated the pipeline so it emits namespace/name pairs and deletes each matching pod with `kubectl delete pod -n "$ns" "$name"` in a `while read` loop.

## Review Notes
- The `calicoctl ipam configure --strictaffinity=<true/false>` and `calicoctl ipam show --show-configuration` commands match the current Calico reference.
- The post uses `calicoctl ipam check`, which is documented in the current Calico Enterprise CLI reference and present in Calico command references historically. Operators using a Calico Open Source build should confirm their installed `calicoctl` includes this subcommand with `calicoctl ipam --help`.
- The Kubernetes field selector `status.podIP` is documented as a supported Pod field selector, and `kubectl run ... --restart=Never -- sleep 30` remains valid in the current kubectl reference.
