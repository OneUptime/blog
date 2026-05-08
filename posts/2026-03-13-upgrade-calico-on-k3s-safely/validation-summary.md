# Validation Summary: How to Upgrade Calico on K3s Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- K3s
- Kubernetes
- kubectl
- calicoctl
- Container Network Interface (CNI)

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- K3s documentation: Basic Network Options / Custom CNI - https://docs.k3s.io/networking/basic-network-options
- Kubernetes documentation: Perform a Rolling Update on a DaemonSet - https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes documentation: Perform a Rollback on a DaemonSet - https://kubernetes.io/docs/tasks/manage-daemon/rollback-daemon-set/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post attributed DaemonSet rolling updates to K3s. This is Kubernetes DaemonSet controller behavior, so the wording was corrected and qualified with the default `maxUnavailable` behavior.
- The upgrade command used an older Calico `v3.27.0` manifest and plain `kubectl apply`. Current Calico documentation describes downloading the current manifest, preserving local manifest changes, and applying it with `kubectl apply --server-side --force-conflicts`, so Step 4 was updated accordingly.
- The original Step 4 did not mention preserving local manifest changes. Calico documentation requires manually applying prior manifest modifications to the downloaded upgrade manifest, and K3s documentation calls out Calico CNI IP forwarding settings, so a concise reminder was added.

## Review Notes
- The `calicoctl get` backup commands use valid resource types and `--all-namespaces` is valid for Calico `NetworkPolicy`.
- The rollback commands are valid for Kubernetes DaemonSets and Deployments, but in a real incident operators should also confirm the desired rollout revision before relying on the default previous revision.
- External connectivity tests that ping `8.8.8.8` are syntactically valid, but environments that block ICMP or internet egress may need an internal service-to-service test instead.
