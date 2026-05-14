# Validation Summary: How to Automate Calico eBPF Installation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Calico eBPF data plane
- Kubernetes
- kubeadm
- Terraform
- Ansible
- kubectl
- GitHub Actions
- AWS

## Sources Consulted
- Calico documentation, "Install in eBPF mode": https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation, "Enabling the eBPF data plane": https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation, "Troubleshoot eBPF mode": https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation, "Installation reference": https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation, "System requirements": https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Kubernetes documentation, "kubeadm Configuration (v1beta4)": https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes documentation, "kubeadm init": https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- GitHub documentation, "Workflow syntax for GitHub Actions": https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The prerequisites listed Helm, but the post's implementation does not use Helm. Removed Helm from the prerequisites.
- The node bootstrap script installed `linux-tools-$(uname -r)` without first updating package metadata and did not ensure `/sys/fs/bpf` existed. Changed it to create `/sys/fs/bpf`, run `apt-get update`, and install the `bpftool` package directly.
- The kubeadm example used `kubeadm.k8s.io/v1beta3`, which is deprecated for current Kubernetes. Updated the example to `kubeadm.k8s.io/v1beta4` and used `proxy.disabled: true` to disable kube-proxy through the current kubeadm configuration API.
- The Ansible commands used shell line-continuation syntax with the `command` module. Rewrote those tasks with folded YAML and fully qualified Ansible module names so the commands are passed correctly.
- The Calico operator wait happened before creating the `kubernetes-services-endpoint` ConfigMap. Calico's eBPF install documentation requires the operator to have a direct API-server endpoint when kube-proxy is not available, so the ConfigMap creation now happens before waiting for the operator rollout.
- The ConfigMap populated the API server host from the Kubernetes service endpoint IP, which may be unstable. Replaced it with explicit `calico_api_server_host` and `calico_api_server_port` variables so automation can provide the stable control-plane address or load balancer endpoint required by Calico.
- The Installation resource set `hostPorts: Disabled`, which is not part of the documented eBPF install example and can conflict with the operator's defaults. Removed that field and added `variant: Calico`.
- The eBPF validation task relied on `bpftool` inside the `calico-node` container. Calico's troubleshooting documentation recommends verifying the Calico node log message that indicates BPF mode started, so the task now checks that log message.
- The GitHub Actions workflow pinned Calico `v3.27.0`, which is outdated for a 2026 post. Updated the example to `v3.32.0`, matching the current Calico documentation consulted during review.
- The Terraform step only passed `AWS_ACCESS_KEY_ID`. Added `AWS_SECRET_ACCESS_KEY` so the example includes the credential pair typically required by the AWS provider when not using OIDC or another credential source.
- The conclusion referred to a "real API server IP"; Calico requires a stable API-server endpoint, especially for HA clusters. Updated the wording accordingly.

## Review Notes
The post is technically valid after the fixes. The Ansible role still assumes the caller supplies inventory, kubeconfig access, `pod_cidr`, `calico_api_server_host`, and optionally `calico_api_server_port`; those are reasonable omissions for a concise blog snippet but should be documented in production playbooks.
