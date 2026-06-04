# Validation Summary: How to Use cert-manager CA Issuer for Self-Signed Internal Certificate Authority

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager CA Issuer and ClusterIssuer
- cert-manager Certificate resources
- cert-manager trust-manager
- TLS and X.509 certificate chains
- OpenSSL
- kubectl and Helm

## Sources Consulted
- cert-manager CA Issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager trust-manager installation documentation: https://cert-manager.io/docs/trust/trust-manager/installation/
- cert-manager trust-manager usage documentation: https://cert-manager.io/docs/trust/trust-manager/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- OpenSSL local command help for `openssl req` and `openssl x509`

## Issues Found
- The namespaced `Issuer` example referenced a CA Secret in the `default` namespace, but the Secret creation command created it in `cert-manager`. cert-manager requires a CA Issuer Secret to be in the same namespace as the `Issuer`, while a `ClusterIssuer` uses the cluster resource namespace, which defaults to `cert-manager`. Updated the initial Secret command to use `default` and added a separate Secret creation command for the `ClusterIssuer` case.
- The generated root CA and rotated CA examples did not explicitly set CA X.509 extensions. Added `basicConstraints = critical,CA:TRUE` and `keyUsage = critical,keyCertSign,cRLSign` to make the CA certificates suitable for signing and aligned with cert-manager CA Issuer guidance.
- The intermediate CA chain explanation said issued certificates include the full chain including the root CA. cert-manager intentionally avoids adding root certificates to `tls.crt`; it stores the leaf followed by the provided intermediate chain in `tls.crt` and stores the corresponding CA certificate in `ca.crt` when known. Updated the wording.
- The Deployment example was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching pod template labels. Added a selector and labels.
- The `secretTemplate` example implied that `secretTemplate` configures inclusion of `ca.crt`. cert-manager includes `ca.crt` when the issuing CA is known; `secretTemplate` only copies labels and annotations to the generated Secret. Updated the explanation and comment.
- The trust-manager install command used a GitHub release manifest URL that returned 404 for `v0.7.0`. Replaced it with the official Helm installation command from the current trust-manager documentation.

## Review Notes
- The trust-manager `Bundle` example is valid, but the official documentation recommends copying trusted roots to a dedicated ConfigMap or Secret for production rotation workflows rather than pointing directly at cert-manager-managed issuer Secrets.
- The `SSL_CERT_FILE` example is application- and image-dependent because it may replace, rather than augment, the default trust store for some TLS clients.
