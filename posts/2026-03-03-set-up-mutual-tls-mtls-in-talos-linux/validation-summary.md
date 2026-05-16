# Validation Summary: How to Set Up Mutual TLS (mTLS) in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- mutual TLS (mTLS)
- TLS certificates and certificate authorities
- Kubernetes
- cert-manager
- nginx
- Cilium
- Istio
- OpenSSL
- kubectl and talosctl

## Sources Consulted
- Talos Linux troubleshooting documentation: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Talos Linux certificate management documentation: https://docs.siderolabs.com/talos/v1.9/security/cert-management
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Cilium mutual authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- NGINX SSL/TLS documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/

## Issues Found
- The cert-manager install command pinned v1.16.0, while the current official static manifest installation documentation references v1.20.2. Updated the URL to v1.20.2.
- The cert-manager readiness command only waited for the `cert-manager` Deployment and did not wait for all installed cert-manager Deployments. Updated it to wait for all Deployments in the `cert-manager` namespace.
- The service certificate examples used the `production` namespace but did not create it. Added an idempotent namespace creation command before applying the certificate manifests.
- The nginx Deployment used the standard `nginx:1.27` image with `runAsNonRoot: true` and `runAsUser: 1000`, which is not a reliable non-root configuration for that image. Updated the example to use `nginxinc/nginx-unprivileged:1.27` with UID/GID 101.
- The mTLS application manifest was missing the `Service` referenced later by `kubectl port-forward -n production svc/mtls-server 8443:8443`. Added the Service manifest.
- The successful curl test connected to `https://localhost:8443/` while validating the server certificate against a certificate whose DNS SANs did not include `localhost`. Updated the command to use `--resolve` and the service DNS name present in the certificate SANs.
- The Istio PeerAuthentication example used `security.istio.io/v1beta1`. Updated it to the current documented `security.istio.io/v1` API version.
- The troubleshooting section said Talos auto-renews leaf certificates in a context that could include client certificates. Updated the wording to clarify that Talos auto-renews server-side certificates, while `talosconfig` and `kubeconfig` client certificates are the user's responsibility.

## Review Notes
- Cilium mutual authentication is documented as beta in the current stable Cilium docs; the example syntax is consistent with Cilium's documented `authentication.mode: required` policy field.
- The cert-manager CA issuer example is technically valid for a demo or internal PKI bootstrap, but the official cert-manager documentation notes that CA issuers require an operational plan for CA rotation and trust distribution in production.
