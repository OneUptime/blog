# Validation Summary: How to Fix Flux CD Self-Signed Certificate Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- GitRepository, HelmRepository, and OCIRepository source APIs
- Kubernetes Secrets, ConfigMaps, Deployments, and Kustomize patches
- TLS, custom CA bundles, and self-signed certificates
- OpenSSL
- cert-manager

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux proxy settings documentation: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Flux create secret git documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux create secret tls documentation: https://fluxcd.io/flux/cmd/flux_create_secret_tls/
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- GitRepository was shown using `.spec.certSecretRef`, but current Flux GitRepository API does not support that field. I changed the Git example to put `ca.crt` in the Git secret referenced by `.spec.secretRef`, and updated the verification commands and summary accordingly.
- The post described extracting a CA certificate from the first `openssl s_client -showcerts` certificate. That first certificate is usually the leaf server certificate, not the CA. I changed the text to use OpenSSL for inspection and to obtain the CA from the service owner or PKI team.
- The OCIRepository section referenced a CA secret but did not create it. I added the matching `kubectl create secret generic registry-ca-cert` command.
- The global CA mount example mounted a single certificate file into `/etc/ssl/certs`, which is less reliable than mounting a complete CA bundle or setting `SSL_CERT_FILE`. I changed it to mount a combined CA bundle over the default bundle path.
- The proxy example mounted a proxy CA certificate but did not point the controller process at it. I changed it to create a combined proxy CA bundle ConfigMap, set `SSL_CERT_FILE`, and include Flux's documented `NO_PROXY` cluster suffixes.
- The cert-manager export command read `.data.ca.crt` from the CA issuer secret, but cert-manager CA issuer secrets are defined with `tls.crt` and `tls.key`. I changed the export command to read `.data.tls.crt`.
- The debug pod command used `-it` with stdin redirection. I changed it to `-i` so the local CA data can be passed on standard input without requiring a TTY.

## Review Notes
The HelmRepository and OCIRepository `certSecretRef` examples match current Flux documentation. The bootstrap `--ca-file` flag is current. Future improvements could mention Flux object-level `proxySecretRef` for GitRepository and OCIRepository, but the existing controller environment variable approach is documented and valid.
