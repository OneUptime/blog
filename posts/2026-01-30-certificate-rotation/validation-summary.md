# Validation Summary: How to Implement Certificate Rotation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SSL/TLS certificates
- Certbot and Let's Encrypt
- systemd timers and services
- Nginx reload hooks
- Kubernetes Ingress
- cert-manager
- HashiCorp Vault PKI secrets engine
- Python `ssl` and `socket`
- OpenSSL CLI

## Sources Consulted
- Certbot User Guide, renewal thresholds and renewal hooks: https://eff-certbot.readthedocs.io/en/stable/using.html
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- HashiCorp Vault PKI secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault PKI tutorial: https://developer.hashicorp.com/vault/tutorials/pki/pki-engine
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- OpenSSL `x509` command documentation: https://docs.openssl.org/3.2/man1/openssl-x509/

## Issues Found
- The post said Certbot only renews certificates within 30 days of expiration. Certbot 4.0.0 and later considers a certificate ready for renewal when less than one third of its lifetime remains, or less than one half for certificates with lifetimes of 10 days or less. I updated the explanation to match current Certbot documentation.
- The post placed a deploy hook in `/etc/letsencrypt/renewal-hooks/deploy/` but did not make it executable. Certbot only runs executable files from the renewal hook directories, so I added the required `chmod +x` command.

## Review Notes
- The cert-manager `Certificate` example includes `commonName`. This is still a valid field, but current cert-manager documentation recommends using `dnsNames` exclusively for DNS names in most leaf certificates unless `commonName` is specifically needed.
- The `ExecStartPost=/bin/bash -c 'systemctl reload nginx || true'` example reloads Nginx after every `certbot renew` run, even if no certificate was renewed. The deploy hook already handles reload after successful renewal, so production setups may prefer to avoid this extra reload.
