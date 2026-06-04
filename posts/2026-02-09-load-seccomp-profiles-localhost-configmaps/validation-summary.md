# Validation Summary: How to Load Seccomp Profiles from Localhost and ConfigMaps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes seccomp profiles
- Kubernetes Pod and container security contexts
- Kubernetes ConfigMaps
- Kubernetes DaemonSets and init containers
- Kubernetes hostPath volumes
- Helm templates
- kubectl
- jq
- OCI seccomp profile JSON

## Sources Consulted
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Restrict a Container's Syscalls with seccomp - https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Configure a Pod to Use a ConfigMap - https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes documentation: Updating Configuration via a ConfigMap - https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes documentation: DaemonSet - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: Init Containers - https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes documentation: Volumes / hostPath - https://kubernetes.io/docs/concepts/storage/volumes/
- OCI Runtime Specification: Seccomp - https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md#seccomp

## Issues Found
- The update section incorrectly said profiles could be updated without restarting pods. Seccomp profiles are applied at container creation time, so containers must be recreated to use a different profile. Updated the wording and command comments to describe rolling out new pods.
- The updated profile ConfigMap used a new name, `seccomp-profiles-v2`, while the DaemonSet still mounted `seccomp-profiles`. Changed the ConfigMap name to `seccomp-profiles` so the restart flow copies the new profile data from the mounted ConfigMap.
- The DaemonSet update wording implied it automatically copied ConfigMap changes. Mounted ConfigMap content can update, but the init container copies files only when the DaemonSet pod starts. Updated the text to restart the DaemonSet pods before updating workloads.
- The Helm hostPath example omitted `type: DirectoryOrCreate`, unlike the earlier DaemonSet example. Added it so the kubelet can create `/var/lib/kubelet/seccomp` when needed.
- The monitoring commands only reported pod-level seccomp profiles and missed container-specific profiles shown earlier in the post. Updated the `jq` filters to include pod defaults and container, init container, and ephemeral container overrides.
- The profile versioning example placed a custom `_comment` field inside the seccomp JSON. Kubernetes documents localhost profiles as JSON following the OCI runtime seccomp schema, so the example now keeps version tracking alongside profile files instead.

## Review Notes
- The seccomp JSON examples are syntactically valid and use OCI seccomp field names such as `defaultAction`, `architectures`, `syscalls`, `names`, and `action`.
- The `localhostProfile` paths are correctly relative to the kubelet seccomp root, which is commonly `/var/lib/kubelet/seccomp` on Linux.
- The examples remain intentionally minimal; real application profiles usually need more syscalls than the short illustrative allowlists shown here.
