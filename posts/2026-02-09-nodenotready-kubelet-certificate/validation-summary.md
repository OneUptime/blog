# Validation Summary: How to Troubleshoot NodeNotReady Status Caused by Kubelet Certificate Expiration

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes kubelet
- Kubernetes CertificateSigningRequest API
- kubeadm
- kube-controller-manager CSR approval
- cert-manager
- Prometheus alerting
- OpenSSL

## Sources Consulted
- Kubernetes: Configure Certificate Rotation for the Kubelet - https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Kubernetes: TLS bootstrapping - https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes: Certificates and Certificate Signing Requests - https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes: Troubleshooting kubeadm, kubelet client certificate rotation fails - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/troubleshooting-kubeadm/
- Kubernetes: kubeadm Configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes: KubeletConfiguration v1beta1 - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- cert-manager Certificate resource documentation - https://cert-manager.io/docs/usage/certificate/
- OpenSSL x509 command documentation - https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The manual renewal flow removed kubelet client certificates and expected kubelet to recover by generating a CSR, which is incomplete for kubeadm clusters after client certificate rotation has already failed. Updated the procedure to follow kubeadm guidance: remove the failed kubelet kubeconfig and client certs, regenerate a node kubeconfig with `kubeadm kubeconfig user`, restore it to the node, wait for the rotated symlink, and then update `kubelet.conf` to reference `/var/lib/kubelet/pki/kubelet-client-current.pem`.
- The example pending CSR used the `kubernetes.io/kubelet-serving` signer for client authentication recovery. Changed it to `kubernetes.io/kube-apiserver-client-kubelet`, which is the kubelet client signer that can be auto-approved by the built-in approver.
- The `serverTLSBootstrap` setting was described as controlling automatic client certificate renewal timing. Corrected it to identify signed kubelet serving certificate bootstrap; `rotateCertificates` is the client certificate rotation setting.
- The kubeadm config example used `kubeadm.k8s.io/v1beta3`, which is deprecated for current kubeadm releases. Updated it to `kubeadm.k8s.io/v1beta4`.
- The controller-manager auto-approval section used incorrect controller names and implied serving CSRs are automatically approved by core Kubernetes. Replaced it with the RBAC ClusterRoleBindings used for bootstrap and client certificate renewal approval, and added the serving certificate caveat.
- The cert-manager section incorrectly positioned cert-manager as a kubelet client certificate manager. Revised it to explain that cert-manager is appropriate for workload or ingress certificates stored in Secrets, while kubelet client rotation uses the Kubernetes CSR API and node-local kubelet certificate files.
- The Prometheus alert used a non-existent `kubelet_certificate_manager_client_expiration_seconds` metric. Updated it to `kubelet_certificate_manager_client_ttl_seconds`, which is present in the Kubernetes metrics reference.
- The in-cluster CronJob example claimed to renew node-local kubelet certificates but contained only placeholder logic and invalid CSR approval RBAC. Replaced it with a host-level audit script and clarified that in-cluster CronJobs cannot safely renew kubelet client certificates by themselves.

## Review Notes
The third-party cert-exporter DaemonSet is plausible for file-based certificate monitoring, but production users should pin the image version and review the elevated hostPath access before deployment. The post now focuses remediation on kubeadm and TLS bootstrap behavior; other managed Kubernetes distributions may require provider-specific recovery steps.
