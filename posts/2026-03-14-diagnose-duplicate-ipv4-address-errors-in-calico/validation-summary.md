# Validation Summary: Diagnosing Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node overview: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The diagnostic bundle command used `calicoctl node diag`, but the documented node diagnostic subcommand is `calicoctl node diags`, and cluster-wide diagnostics are collected with `calicoctl cluster diags`. The post now uses `calicoctl cluster diags` for the full diagnostic bundle step.
- The `calicoctl node status` examples did not make clear that node commands must be run on a Calico node host. The relevant examples now use `sudo calicoctl node status` and note that it should be run on each affected node.
- The troubleshooting note used `kubectl debug node/<name>` without specifying an image. Kubernetes examples for node debugging include `-it --image=<image>`, so the post now uses `kubectl debug node/<name> -it --image=busybox`.
- The RBAC check combined a specific `kubectl auth can-i create ...` query with `--list`. Kubernetes documents `--list` as a separate allowed-actions listing mode, so the post now uses a direct create permission check.

## Review Notes
The remaining commands are general diagnostic commands and may need namespace or label adjustments depending on how Calico was installed. The `calico-system` namespace is correct for operator-managed Calico installs, while older manifest-based installs may use `kube-system`.
