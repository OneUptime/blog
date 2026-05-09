# Validation Summary: How to Troubleshoot Calico Troubleshooting Command Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Tigera Operator
- Kubernetes RBAC
- BIRD/BGP

## Sources Consulted
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: calicoctl version, https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico documentation: End user RBAC, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Kubernetes documentation: kubectl auth can-i, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The RBAC section said `calicoctl` uses the current kubeconfig ServiceAccount. This is too narrow because the kubeconfig identity can be a user or a service account. Changed the wording to "current kubeconfig identity."
- The RBAC examples omitted the Calico CRD API group. Updated the `kubectl auth can-i` checks to use `felixconfigurations.crd.projectcalico.org`, `bgppeers.crd.projectcalico.org`, and `globalnetworkpolicies.crd.projectcalico.org`, matching Calico's documented Kubernetes RBAC API group.
- The `calicoctl node status` section said the command requires exec into a `calico-node` pod. Calico documents node subcommands as commands that must run directly on the compute host running the Calico node instance, and notes that node status may not work from a local machine or container. Updated the explanation accordingly.
- The BGP fallback comment described using the Felix metrics port, but the command actually execs into `calico-node` and runs `birdcl`. Updated the comment to match the command.

## Review Notes
The `calico-system` namespace is correct for operator-based Calico installations. Calico's troubleshooting documentation notes that manifest-based installations commonly use `kube-system`, so readers on manifest-based installs may need to adjust the namespace.
