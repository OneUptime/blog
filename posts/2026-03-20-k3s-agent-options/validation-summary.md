# Validation Summary: How to Configure K3s Agent Options

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- K3s
- Kubernetes
- kubelet
- containerd
- Flannel
- systemd / journald

## Sources Consulted
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s advanced options and logging notes: https://docs.k3s.io/advanced
- K3s cluster access: https://docs.k3s.io/cluster-access
- K3s CIS self-assessment guide 1.9: https://docs.k3s.io/security/self-assessment-1.9
- Kubernetes node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/

## Issues Found
- The networking section listed `cni-bin-dir` and `cni-conf-dir` as K3s agent config keys. These are not current documented K3s agent options, so they were replaced with the documented `flannel-conf` and `flannel-cni-conf` overrides.
- The `flannel-iface`, `protect-kernel-defaults`, and `node-status-update-frequency` comments did not match the documented behavior. The comments were corrected so they describe the actual K3s or kubelet semantics.
- Multiple `eviction-hard` examples only set some thresholds. Kubernetes documents that when any hard eviction threshold is changed, unspecified defaults are not inherited and become zero. The examples were updated to include the missing `nodefs.inodesFree`, `imagefs.available`, and `imagefs.inodesFree` thresholds.
- The verification section used `ps aux | grep kubelet`, but K3s embeds kubelet in the `k3s` process. That check was replaced with a `journalctl -u k3s-agent -b | grep "Running kubelet"` based command that matches how K3s exposes kubelet startup arguments.
- The verification comment said the command checked labels and annotations, but the command only shows labels. The comment was corrected.

## Review Notes
- K3s applies `node-label` and `node-taint` at registration time. Later changes should be made with `kubectl`, not by rerunning the agent with new values.
- K3s supports kubelet configuration drop-ins starting with Kubernetes v1.32-based releases, but the `kubelet-arg` approach used in the post remains supported and valid for the examples shown.
