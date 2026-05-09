# Validation Summary: Troubleshoot Cilium on k0s

## Status
validated

## Post Type
Guide

## Technologies Covered
- k0s
- Kubernetes
- Cilium
- CNI
- containerd
- Kubernetes NetworkPolicy

## Sources Consulted
- k0s Networking documentation: https://docs.k0sproject.io/stable/networking/
- k0s Configuration Options documentation: https://docs.k0sproject.io/v1.34.3+k0s.0/configuration/
- k0s Runtime (CRI) documentation: https://docs.k0sproject.io/v1.31.3+k0s.0/runtime/
- k0s install controller CLI documentation: https://docs.k0sproject.io/head/cli/k0s_install_controller/
- Cilium k0s installation documentation: https://docs.cilium.io/en/stable/installation/k0s/
- Cilium CLI install command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium Kubernetes CNI configuration documentation: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The Step 1 comment described `/var/lib/k0s/bin/` as a CNI configuration location. k0s documentation describes this path as containing k0s-bundled networking utilities such as iptables, so the comment was corrected.
- The Cilium install command pinned `--version 1.15.0`, which is outdated relative to the current Cilium stable documentation consulted during review. It was updated to `--version 1.19.3`.
- The `kubectl debug node` examples checked `/etc/cni/net.d`, `/opt/cni/bin`, and `/run/k0s` directly inside the debug container. Kubernetes mounts the node root filesystem at `/host`, so the commands were corrected to use `/host/etc/cni/net.d`, `/host/opt/cni/bin`, and `/host/run/k0s`.
- The Cilium binary check piped outside the remote debug command, so `grep` could run locally instead of in the debug container. It was wrapped with `sh -c` so both `ls` and `grep` run in the node debug pod.
- The NetworkPolicy validation test attempted to access `server.k0s-test.svc.cluster.local` without creating a Kubernetes Service. Added `kubectl expose` for the nginx pod and a `kubectl wait` command so the test has a ready pod and resolvable service before applying the deny policy.

## Review Notes
- The k0s custom CNI configuration fields are valid, and official k0s documentation confirms that changing the network provider after cluster initialization requires a full redeployment.
- The Cilium CNI paths and `05-cilium.conflist` filename match the official Cilium CNI configuration documentation for default installations.
- The guide remains version-sensitive because it pins a Cilium release; future reviews should compare that version against the then-current Cilium and k0s compatibility guidance.
