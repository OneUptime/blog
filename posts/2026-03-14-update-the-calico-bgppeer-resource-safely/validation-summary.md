# Validation Summary: Safely Updating the Calico BGPPeer Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl install guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Kubernetes API datastore guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The troubleshooting section said unknown fields are silently ignored by `kubectl`, but the guide applies resources with `calicoctl`, and Calico provides `calicoctl validate` for structural and Calico-specific validation. I changed the guidance to validate the manifest with `calicoctl validate -f bgppeer.yaml`.
- The RBAC example combined a specific `kubectl auth can-i` permission check with `--list`, which is not the documented usage. I split it into a specific permission check and a separate `kubectl auth can-i --list` command.
- The RBAC example used the internal `crd.projectcalico.org` storage API group. I changed it to `globalnetworkpolicies.projectcalico.org`, which matches the public Calico API group used by `apiVersion: projectcalico.org/v3`.

## Review Notes
- The operational workflow is broadly correct: export current state, review changes, apply with `calicoctl`, monitor Calico logs and BGP status, and roll back with the saved manifest if needed.
- The Calico documentation recommends using a `calicoctl` version that matches the Calico cluster version.
- The log namespace `calico-system` is correct for common operator-based installations, but some older or manifest-based installations may run Calico components in a different namespace such as `kube-system`.
