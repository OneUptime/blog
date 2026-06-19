# Validation Summary: How to Handle Certificate Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TLS/SSL certificates
- Let's Encrypt
- Certbot
- Kubernetes
- cert-manager
- Cloudflare DNS-01 challenges
- OpenSSL
- Prometheus
- Blackbox Exporter
- Python ssl module
- Kubernetes Secrets and Ingress

## Sources Consulted
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- OpenSSL req documentation: https://docs.openssl.org/3.5/man1/openssl-req/
- OpenSSL x509v3_config documentation: https://docs.openssl.org/3.6/man5/x509v3_config/
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html

## Issues Found
- The cert-manager install command was pinned to v1.14.0, which is outdated. Updated it to the current documented manifest version, v1.20.2.
- The cert-manager readiness commands waited for cert-manager and webhook, but not cainjector. Added the missing cainjector deployment wait because the official static manifest installs all three components.
- The HTTP-01 ClusterIssuer examples used `ingress.class`. Updated them to `ingress.ingressClassName`, which cert-manager documents as the recommended field for most ingress controllers.
- The OpenSSL root CA certificate command did not add CA extensions. Added critical `basicConstraints` and `keyUsage` extensions so the generated root certificate is explicitly usable as a CA.
- The Python certificate check script parsed certificate expiry with `datetime.strptime()` and compared it to local naive time. Updated it to use `ssl.cert_time_to_seconds()` and UTC-aware datetimes, matching Python's documented handling for certificate `notAfter` values.
- The Kubernetes secret cleanup pipeline could invoke `kubectl delete secret` with no secret name if there were no old matching secrets. Replaced the `xargs` call with a shell loop that does nothing on empty input.

## Review Notes
- The Certbot examples are technically valid, but production deployments should account for how the package was installed because modern Certbot packages often install a systemd timer automatically.
- The OpenSSL examples are suitable for a practical tutorial, but a production PKI should use a fuller CA configuration, serial database, revocation handling, and protected key storage.
