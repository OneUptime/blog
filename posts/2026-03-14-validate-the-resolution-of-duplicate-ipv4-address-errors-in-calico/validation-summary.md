# Validation Summary: Validating the Resolution of Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- Kubernetes RBAC
- Kubernetes events and pod networking

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl ipam reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity

## Issues Found
- The connectivity test said it deployed pods on different nodes, but the original `kubectl run` commands did not constrain scheduling. Updated the commands to select two Kubernetes node names and pass `spec.nodeName` through `kubectl run --overrides`, which is a documented `kubectl run` option.
- The pod recovery check included the table header as a non-running pod because it omitted `--no-headers`. Added `--no-headers` to avoid false positives.
- The deployment replica check compared the `READY` column to the `UP-TO-DATE` column, so it would incorrectly print healthy deployments. Updated the `awk` command to split the `READY` column and compare ready replicas against desired replicas.
- The RBAC command claimed to show who can modify Calico resources, but `kubectl auth can-i` checks whether the current user, or an explicitly impersonated user, can perform an action. Updated the comment and command to check the current user's permission to create Calico global network policies.

## Review Notes
The examples assume Calico is installed in the `calico-system` namespace and that there are at least two schedulable nodes for cross-node testing. Some Calico installations use a different namespace, such as `kube-system`, so operators should adjust namespace arguments to match their deployment.
