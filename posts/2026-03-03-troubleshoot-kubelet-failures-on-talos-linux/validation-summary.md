# Validation Summary: How to Troubleshoot Kubelet Failures on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes
- kubelet
- containerd
- CoreDNS / kube-dns
- Kubernetes certificates and CSRs
- Talos machine configuration

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Sidero Labs Talos troubleshooting guide: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Sidero Labs Talos certificate management guide: https://docs.siderolabs.com/talos/v1.10/security/cert-management
- Sidero Labs Talos static pods guide: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/images-container-runtime/static-pods
- Sidero Labs Talos hostname guide: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Kubernetes kubelet TLS bootstrapping documentation: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes DNS configuration documentation: https://kubernetes.io/docs/tasks/access-application-cluster/configure-dns-cluster/
- Kubernetes static pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/

## Issues Found
- The machine configuration inspection command used `talosctl get machineconfiguration`, but the official resource/command documented by Talos is `machineconfig`, optionally with the `v1alpha1` resource ID. Changed it to `talosctl -n <node-ip> get machineconfig v1alpha1 -o yaml | grep endpoint`.
- The certificate recovery section advised regenerating machine configuration with `talosctl gen config` and reapplying `worker.yaml`. That can generate new secrets and is not the correct general remediation for kubelet certificate issues. Replaced it with checking Kubernetes CSRs, restarting kubelet when rotation is needed, and inspecting Talos Kubernetes dynamic certificates on a control plane node.
- The static pod log examples used `talosctl logs kube-apiserver` and `talosctl logs kube-scheduler` as if those were Talos services. Control plane components run as Kubernetes static pods, so the examples now find pod names and use `kubectl logs` with the correct container names.
- The upgrade example hardcoded `ghcr.io/siderolabs/installer:v1.7.0`, which is outdated for a general troubleshooting guide. Replaced it with `ghcr.io/siderolabs/installer:<talos-version>` so readers choose the intended Talos release.

## Review Notes
The remaining commands and configuration examples align with current Talos and Kubernetes documentation. The API server `curl` example verifies reachability from the workstation, not from the Talos node itself; it is still useful as a first connectivity check, but a future revision could add node-side network diagnostics for harder reachability problems.
