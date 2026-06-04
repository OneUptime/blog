# Validation Summary: How to Debug Kubernetes Kubelet Not Registering Node with API Server

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes kubelet
- Kubernetes Node objects and node heartbeats
- Kubernetes kubeconfig and TLS bootstrapping
- Kubernetes RBAC and Node authorization
- kubeadm bootstrap tokens
- containerd and CRI tooling
- systemd service configuration
- Prometheus alerting rules

## Sources Consulted
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status
- Kubernetes Lease API documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration v1beta1 API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Node authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/node/
- Kubernetes TLS bootstrapping documentation: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping
- Kubernetes bootstrap token documentation: https://kubernetes.io/docs/reference/access-authn-authz/bootstrap-tokens
- Kubernetes kubeadm token documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Kubernetes certificate rotation documentation: https://kubernetes.io/docs/tasks/tls/certificate-rotation

## Issues Found
- The post advised grepping `/var/lib/kubelet/config.yaml` for kubeconfig paths. `KubeletConfiguration` does not carry the `--kubeconfig` and `--bootstrap-kubeconfig` paths, so this was changed to inspect the systemd unit and drop-ins with `systemctl cat kubelet | grep -i kubeconfig`.
- The node-name section used `grep server /etc/kubernetes/kubelet.conf` as a way to view the node name. That field shows the API server endpoint, not the kubelet node identity. It was changed to inspect the kubelet client certificate subject.
- The node-name explanation said the node name must be resolvable by the API server. Kubernetes requires the Node name to be unique, a valid DNS subdomain name, and matched by the kubelet identity; DNS resolution by the API server is not generally required. The sentence was corrected.
- The example kubelet service used `--pod-infra-container-image`, which is deprecated in older supported Kubernetes releases and absent from the current kubelet reference. The flag was removed from the example.
- The RBAC checks impersonated only `system:node:worker-1`. Node authorization expects kubelet credentials in the `system:nodes` group, so the examples now include `--as-group=system:nodes`.
- The container runtime section implied runtime failures always prevent registration. A kubelet can register a node while reporting it NotReady if the runtime is unhealthy, so the wording was corrected.
- The timeout section described the status frequency settings as increasing update frequency. The values shown are the documented defaults, so the wording was changed to checking status and lease update timing.
- The reset procedure moved `/var/lib/kubelet` and then removed files from the moved path, which would not reliably preserve the kubelet configuration needed to restart. The commands now back up the directory and remove generated kubelet client certificates while keeping configuration in place.

## Review Notes
The post remains a general troubleshooting guide rather than a version-specific kubeadm runbook. Some file paths and systemd unit locations vary by distribution and Kubernetes installer, but the examples are plausible for kubeadm-style Linux nodes.
