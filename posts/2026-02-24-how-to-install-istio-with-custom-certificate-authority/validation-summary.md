# Validation Summary: How to Install Istio with Custom Certificate Authority

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Kubernetes
- OpenSSL
- Helm
- cert-manager
- cert-manager istio-csr
- HashiCorp Vault PKI
- X.509 certificate chains and mTLS

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Certificate Management tasks: https://istio.io/latest/docs/tasks/security/cert-management/
- Istio FAQ on workload certificate lifetime and `SECRET_TTL`: https://istio.io/latest/about/faq/
- Istio `istioctl` and IstioOperator reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `pilot-discovery` environment variable reference for `ENABLE_CA_SERVER`, `DEFAULT_WORKLOAD_CERT_TTL`, and related settings: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager istio-csr usage documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/

## Issues Found
- The cert-manager install command pinned the static manifest to `v1.14.0`, while current cert-manager documentation lists `v1.20.2` as the current static install version. Updated the URL to `v1.20.2`.
- The istio-csr Helm example used the older `jetstack/cert-manager-istio-csr` chart reference and set `app.tls.rootCAFile` without mounting the root CA secret at that path. Updated the command to use the documented OCI chart, `helm upgrade --install`, `--wait`, and the required `volumeMounts` / `volumes` settings. Because the post creates a Kubernetes TLS secret, the root CA file path was set to the mounted `tls.crt`.
- The istio-csr section installed the chart before creating the issuer it referenced. Moved the issuer and root CA secret creation before the istio-csr install command so the explicit issuer configuration can become ready cleanly.
- The workload certificate chain verification tried to run `openssl s_client` against `localhost:15012` from the sidecar container. Port 15012 is the istiod xDS/CA endpoint, not a local listener that exposes the workload certificate chain. Replaced this with `istioctl proxy-config secret -o json`, matching Istio/cert-manager validation examples, then decode and inspect the delivered certificate chain locally.
- The final `openssl verify` command referred to `workload-cert.pem`, but the corrected extraction writes `workload-chain.pem`. Updated the command to verify that file.

## Review Notes
- The Istio plug-in CA `cacerts` secret filenames, certificate-chain ordering, default 24-hour workload certificate lifetime, `SECRET_TTL`, `DEFAULT_WORKLOAD_CERT_TTL`, `MAX_WORKLOAD_CERT_TTL`, `caAddress`, and `ENABLE_CA_SERVER=false` guidance align with current official documentation.
- cert-manager's istio-csr documentation recommends using a namespaced `Issuer` when possible because access control is easier to reason about. The post's `ClusterIssuer` example is still valid, but production readers should account for the cluster resource namespace and RBAC model.
