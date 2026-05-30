# Validation Summary: How to Troubleshoot AKS Kubelet Certificate Rotation Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes kubelet
- Kubernetes CertificateSigningRequest API
- Kubelet TLS bootstrapping and certificate rotation
- kubectl
- Azure CLI
- Prometheus metrics
- Linux systemd, chrony, and OpenSSL

## Sources Consulted
- Kubernetes: Configure Certificate Rotation for the Kubelet - https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Kubernetes: TLS bootstrapping - https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes: Certificates and Certificate Signing Requests - https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes: Kubelet Configuration (v1beta1) - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes: kubectl drain reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Local Files And Paths Used By The Kubelet - https://kubernetes.io/docs/reference/node/kubelet-files/
- Microsoft Learn: Upgrade Azure Kubernetes Service (AKS) node images - https://learn.microsoft.com/en-us/azure/aks/upgrade-node-image
- Microsoft Learn: az aks nodepool CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: az vmss CLI reference - https://learn.microsoft.com/en-us/cli/azure/vmss

## Issues Found
1. The certificate rotation timing was imprecise. The post said rotation typically happens at 70-80% of the certificate lifetime; Kubernetes documents that kubelet rotation can happen when 30% to 10% of the lifetime remains. Updated the timing to match Kubernetes documentation.

2. The CSR approval/signing flow incorrectly attributed approval to the API server's certificate controller. Kubernetes documents the built-in approver and signer as part of kube-controller-manager, with kubelet retrieving the signed certificate through the API. Updated the prose and Mermaid diagram.

3. The serving certificate description implied that both kubelet client and serving certificates are always cluster-CA-signed. Kubernetes allows the kubelet to use a locally generated serving certificate unless server TLS bootstrap is enabled. Updated the explanation to distinguish client certificates from serving certificates.

4. The `kubectl debug node/...` examples used `chroot /host` without a privileged debug profile. Kubernetes documents that `chroot /host` can fail unless a privileged pod is used, such as with `--profile=sysadmin`. Added `--profile=sysadmin` to the relevant debug commands.

5. The VMSS name extraction example did not correctly strip the numeric suffix from AKS node names such as `aks-nodepool1-12345678-vmss000003`. Updated the shell example to derive `VMSS_NAME` and `INSTANCE_ID` correctly, and used `$VMSS_NAME` in the delete command.

6. The Prometheus metric example used `kubelet_certificate_manager_client_expiration_seconds - time()`. Current Kubernetes metrics reference documents `kubelet_certificate_manager_client_ttl_seconds` as the client certificate TTL gauge. Updated the metric and alert expression.

7. The serving certificate path example only checked `/var/lib/kubelet/pki/kubelet.crt`. For server TLS bootstrap, kubelet commonly uses a rotated server certificate such as `/var/lib/kubelet/pki/kubelet-server-current.pem`, while local serving certificates may use `kubelet.crt`. Updated the example to show both cases.

## Review Notes
The local review environment did not have `kubectl` or `az` installed, so CLI validation was performed against official Kubernetes and Microsoft Learn command references rather than local `--help` output. The article remains AKS-focused, but several kubelet file paths are implementation details and can vary by node image or kubelet flags.
