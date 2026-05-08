# Validation Summary: Safely Updating the Calico FelixConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Calico FelixConfiguration resources
- calicoctl
- Kubernetes
- kubectl
- Kubernetes RBAC and audit/event inspection

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl command reference for validation behavior: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes object management documentation for server-side field validation: https://kubernetes.io/docs/concepts/overview/working-with-objects/

## Issues Found
- The backup, diff, verification, rollback verification, and multi-cluster comparison examples exported all FelixConfiguration resources without `--export`. Calico documentation recommends exporting the named resource, commonly `default`, with `--export` before storing or reapplying configuration. Updated the commands to use `calicoctl get felixconfiguration default -o yaml --export` where a reusable manifest is being generated.
- The RBAC example used `kubectl auth can-i create ... --all-namespaces --list`, which mixes the specific access check form with the `--list` form. Updated it to a direct permission check for updating FelixConfiguration resources and a separate `kubectl auth can-i --list | grep projectcalico` command.
- The troubleshooting section said unknown fields are silently ignored by `kubectl`. Modern Kubernetes supports server-side field validation that can warn or fail for unknown fields, while ignored fields depend on validation settings. Updated the note to reflect current validation behavior and the use of `calicoctl apply`.

## Review Notes
- The Calico log namespace and labels shown are correct for common Tigera operator installations, but clusters installed from manifests may use a different namespace such as `kube-system`.
- `calicoctl node status` is a valid BGP troubleshooting command, but Calico documents that it must be run on the node whose local Calico agent status is being inspected.
