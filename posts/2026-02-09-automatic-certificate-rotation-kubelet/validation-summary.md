# Validation Summary: How to Set Up Automatic Certificate Rotation for kubelet Client Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubelet
- kubeadm
- Kubernetes CertificateSigningRequest API
- Kubernetes RBAC
- Prometheus alerting
- OpenSSL
- systemd

## Sources Consulted
- Kubernetes: Configure Certificate Rotation for the Kubelet - https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Kubernetes: TLS bootstrapping - https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes: Kubelet Configuration v1beta1 - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: kubeadm Configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes: Configuring each kubelet in your cluster using kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/
- Kubernetes: Certificates and Certificate Signing Requests - https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes: Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes: kubectl certificate approve reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_certificate/kubectl_certificate_approve/

## Issues Found
- Updated the kubeadm configuration API from `kubeadm.k8s.io/v1beta3` to the current `kubeadm.k8s.io/v1beta4`.
- Corrected the certificate approval explanation: the API server authenticates bootstrap tokens, while the controller manager handles CSR approval/signing when RBAC allows it.
- Corrected the automatic approval RBAC binding for initial kubelet client CSRs from `system:nodes` to `system:bootstrappers`; renewals remain bound to `system:nodes`.
- Replaced unreliable CSR filtering and bulk approval examples with signer-aware commands for `kubernetes.io/kube-apiserver-client-kubelet`.
- Replaced the obsolete/nonexistent Prometheus metric `kubelet_certificate_manager_client_expiration_seconds` with the current Kubernetes metric `kubelet_certificate_manager_client_ttl_seconds`.
- Corrected the rotation timing from a fixed 80% lifetime trigger to Kubernetes' documented 30% to 10% time-remaining rotation window.
- Corrected `--cluster-signing-duration` placement from kube-apiserver to kube-controller-manager.
- Clarified that kubelet serving certificate rotation can be enabled with `serverTLSBootstrap`, but serving CSRs are not approved by the built-in approver.
- Added a bootstrap kubeconfig precondition to the forced rotation test so the example does not imply that deleting the active kubelet client certificate is universally safe.

## Review Notes
- The post is technically relevant and contains implementation details, commands, Kubernetes YAML, and Prometheus examples.
- Local Kubernetes CLIs (`kubectl`, `kubeadm`, and `kubelet`) were not installed in this workspace, so CLI behavior was reviewed against official Kubernetes reference documentation rather than local `--help` output.
- Local checks: `validation.json` parsed with `jq`, all YAML blocks parsed with PyYAML, and Bash snippets passed `bash -n` after replacing documentation placeholders such as `<csr-name>` with sample values.
