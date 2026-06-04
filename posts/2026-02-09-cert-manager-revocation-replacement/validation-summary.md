# Validation Summary: How to Implement cert-manager Certificate Revocation and Replacement Procedures

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- cert-manager Certificate resources and ACME issuers
- cmctl
- Certbot / ACME certificate revocation
- ingress-nginx ConfigMap configuration
- TLS, CRL, and OCSP revocation concepts
- Python ssl and pyOpenSSL
- PrometheusRule monitoring

## Sources Consulted
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager cmctl renew documentation: https://cert-manager.io/v1.11-docs/reference/cmctl/
- Certbot revocation documentation: https://eff-certbot.readthedocs.io/en/stable/using.html#revoking-certificates
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- OpenSSL OCSP command documentation: https://docs.openssl.org/3.5/man1/openssl-ocsp/

## Issues Found
- The post stated that certificate authorities handle revocation when cert-manager requests it. cert-manager does not provide a Certificate revocation workflow, so I changed the text to say revocation must be performed with the issuing CA or an ACME client, followed by cert-manager replacement.
- The emergency replacement flow deleted the TLS Secret to trigger reissuance. cert-manager documents `cmctl renew` as the manual renewal trigger, so I replaced Secret deletion with `cmctl renew` and aligned the Certificate name used in the YAML and command.
- The private-key compromise procedure deleted the Secret before extracting the certificate and then attempted to revoke without the private key. I reordered the commands to extract both certificate and key first, pass `--key-path` to Certbot, configure `rotationPolicy: Always`, and trigger replacement with `cmctl renew`.
- The bulk replacement script deleted every Secret to force reissuance. I changed it to use `cmctl renew` for each Certificate.
- The ingress-nginx OCSP ConfigMap used `ssl-stapling` and `ssl-stapling-verify`, which are nginx directives but not current ingress-nginx ConfigMap keys. I replaced them with the documented `enable-ocsp: "true"` key.
- The Python example implied that `ssl.create_default_context()` performs revocation checks during the TLS handshake and returned `True` without checking revocation status. Python's default OpenSSL context verifies trust and hostnames but does not require or verify CRLs by default and does not automatically perform OCSP checks, so I changed the code into an OCSP AIA extraction helper and corrected the comments.
- The Prometheus alerts were named as certificate replacement alerts even though `changes(certmanager_certificate_ready_status[...])` only detects readiness status changes. I renamed the alerts and descriptions to match the metric behavior.
- The embedded runbook had malformed Markdown fence endings and still used Secret deletion for replacement. I corrected the fence and changed the command to `cmctl renew`.
- The revocation drill used a Let's Encrypt staging issuer but revoked without passing the staging ACME server. Certbot requires the same staging or non-default server flag for revocation, so I added the staging `--server` value, extracted the private key, added `--key-path`, and configured `rotationPolicy: Always`.
- The automated revocation Job used one variable as both the Secret and Certificate name. I split it into `SECRET_NAME` and `CERTIFICATE_NAME`, extracted both certificate and key, passed `--key-path`, and used `cmctl renew` for replacement.

## Review Notes
- `certbot`, `kubectl`, and `cmctl` were not installed in the workspace, so command validation was performed against official documentation rather than local CLI help.
- For non-Let's Encrypt or staging ACME issuers, revocation commands must include the issuer's ACME directory URL with `--server`.
