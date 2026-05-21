# Validation Summary: How to Set Up Mutual TLS at Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService APIs
- Istio ingress gateway TLS and mutual TLS
- Kubernetes Secrets
- OpenSSL certificate generation
- curl TLS client options

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway network topology / XFCC documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- curl man page: https://curl.se/docs/manpage.html
- Local OpenSSL help output for `openssl req` and `openssl x509`

## Issues Found
- The separate auto-discovered Istio CA secret used `--from-file=ca.crt=ca.crt`. Istio's documented separate `<secret>-cacert` format uses the `cacert` key, so the command was changed to `--from-file=cacert=ca.crt`.
- The multiple-CA bundle example used the same incorrect `ca.crt` key for the separate `<credentialName>-cacert` secret. It was changed to `--from-file=cacert=combined-ca.crt`.
- The text said Istio does not natively support CRLs at the gateway level. Istio Gateway supports CRL configuration through credential data, so the revocation section was corrected to describe using a CRL and to limit the unsupported statement to OCSP-based client certificate revocation checking.

## Review Notes
- The tutorial uses the Istio `networking.istio.io/v1` Gateway and VirtualService APIs, which are current in the Istio 1.30 documentation consulted during review.
- The server certificate generation example uses a simple subject CN and does not add SAN extensions. This is enough to demonstrate the certificate flow, but production certificates should include DNS SANs for the gateway hostname.
