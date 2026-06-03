# Validation Summary: How to Upgrade Certificate Authority Certificates During Cluster Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PKI certificates
- kubeadm certificate management
- kubelet certificate rotation
- OpenSSL
- kubectl
- cert-manager
- Flux HelmRelease and HelmRepository resources
- PrometheusRule alerts

## Sources Consulted
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/
- Kubernetes certificate management with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- kubeadm certs command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/
- kubeadm init phase certs reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/
- Kubernetes kubelet certificate rotation: https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Kubernetes service accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/

## Issues Found
- The post stated that the cluster CA signs service accounts and implied one CA covers all core components. Updated the explanation to distinguish the Kubernetes general CA, etcd CA, front-proxy CA, and service account signing key pair.
- The certificate expiration script checked the API server certificate repeatedly instead of each file in the loop. Updated it to check each local certificate file with `openssl x509 -checkend`.
- The backup script duplicated the etcd certificate directory and used unprivileged operations for `/backups` and `/etc/kubernetes/pki`. Updated it to use `sudo`, archive the full PKI directory once, and quote paths.
- The new CA generation example used a smaller key and did not explicitly set CA certificate extensions. Updated it to use a 4096-bit RSA key, SHA-256, and CA-specific X.509 extensions.
- The kubeadm rotation section described `kubeadm certs renew all` as CA rotation. Updated it to clarify that kubeadm renews leaf certificates and does not renew CA certificates.
- The kubeadm restart example used `systemctl restart kubelet` as if it restarted all control plane components. Updated it to restart static Pod control plane components by temporarily moving manifests, matching Kubernetes guidance.
- The manual API server certificate example generated a certificate without subject alternative names or server authentication usage and restarted a non-existent `kube-apiserver` systemd service in kubeadm static Pod deployments. Updated the example to include SANs, copy CSR extensions into the issued certificate, and restart the API server static Pod via its manifest.
- The trust chain update script edited `/var/lib/kubelet/config.yaml`, which is not where kubelet cluster CA trust is normally configured in kubeadm clusters. Updated it to modify `/etc/kubernetes/kubelet.conf` with `kubectl config set-cluster`.
- The rolling node update script overwrote `ca.crt` with a CA bundle and did not update kubelet kubeconfig trust. Updated it to write `ca-bundle.crt` and update `/etc/kubernetes/kubelet.conf`.
- The cert-manager installation snippet used an invalid `apiVersion: helm.sh/v3` for `HelmRelease`. Updated it to Flux's `helm.toolkit.fluxcd.io/v2` HelmRelease and added the required `source.toolkit.fluxcd.io/v1` HelmRepository.
- The Prometheus alerts compared the `_count` series of `apiserver_client_certificate_expiration_seconds` to a duration, but the metric is a histogram and `_count` is a sample count. Updated the expressions to use the histogram buckets with `histogram_quantile`.

## Review Notes
The Prometheus metric used in the post tracks API server client certificates observed in authenticated requests; it is useful but not a complete inventory of every cluster certificate on disk. The cert-manager example is valid as a cert-manager Certificate resource, but cert-manager does not automatically replace kubeadm control plane CA files without additional operational steps.
