# Validation Summary: How to Handle K3s Agent Nodes

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubectl, kubelet, node lifecycle)
- containerd (container runtime)
- crictl (CRI debugging tool)
- systemd / systemctl / journalctl
- Prometheus Operator / kube-prometheus-stack (ServiceMonitor)
- Cloud-init
- Bash scripting

## Sources Consulted
- K3s official documentation (https://docs.k3s.io/)
- K3s installation reference: https://docs.k3s.io/installation/configuration
- K3s agent configuration: https://docs.k3s.io/cli/agent
- K3s quick-start guide: https://docs.k3s.io/quick-start
- Kubernetes kubectl drain docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Kubernetes node taints and tolerations docs
- Kubernetes kubelet eviction & node-allocatable docs
- Prometheus Operator ServiceMonitor CRD docs
- cloud-init documentation for write_files and runcmd modules

## Issues Found
1. **Misleading container-runtime-endpoint comment** — The config snippet claimed `/run/containerd/containerd.sock` was the K3s "default." K3s actually embeds its own containerd at `/run/k3s/containerd/containerd.sock`. Updated the comment to clarify the embedded default path and that this option is only needed when overriding with an external runtime.
2. **Mismatched comment on K3S_NODE_LABEL** — The environment variables section said "Optional: Disable servicelb and traefik on agent" above a `K3S_NODE_LABEL` setting, which actually applies node labels at registration. Corrected the comment to reflect what the variable does.

## Review Notes
- The `kubectl uncordon` comment describing the change as removing a "SchedulingDisabled taint" is slightly imprecise — `cordon`/`uncordon` toggle `spec.unschedulable`, with the node controller adding/removing the `node.kubernetes.io/unschedulable:NoSchedule` taint as a side effect. The post's description is acceptable shorthand and was left as written.
- The ServiceMonitor example uses `selector.matchLabels.app.kubernetes.io/name: kubelet`. Some kube-prometheus-stack installs label the kubelet service `k8s-app: kubelet` instead — readers may need to adjust the selector for their specific install. The post says "Requires prometheus-operator or kube-prometheus-stack" so adjusting per install is expected.
- The k3s/kubernetes version shown in the example `kubectl get nodes` output (`v1.28.4+k3s1`) is older than current releases but is acceptable as an illustrative example.
- All `kubectl`, `crictl`, `systemctl`, `journalctl`, `curl`, and shell pipeline syntax checked against current CLI behavior and verified correct (including the `awk '{print $8}'` extraction of the NODE column from `kubectl get pods --all-namespaces -o wide --no-headers`).
- The K3s install script invocation, `K3S_URL` / `K3S_TOKEN` env vars, node-token path (`/var/lib/rancher/k3s/server/node-token`), agent uninstall script path (`/usr/local/bin/k3s-agent-uninstall.sh`), config file path (`/etc/rancher/k3s/config.yaml`), and config keys (`server`, `token`, `token-file`, `node-label`, `node-taint`, `kubelet-arg`, `protect-kernel-defaults`) all verified accurate.
- Cloud-init `INSTALL_K3S_EXEC="agent"` combined with a config file containing `server:` and `token:` is a valid way to install K3s in agent mode.
