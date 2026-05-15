# Validation Summary: How to Enable TLS/SSL on Nginx in RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx
- TLS/SSL
- OpenSSL
- firewalld
- Certbot / Let's Encrypt
- systemd timers
- OCSP stapling

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Adding TLS encryption to an NGINX web server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Certbot instructions for Nginx on RHEL/CentOS-style systems: https://certbot.eff.org/instructions?os=centosrhel8&tab=standard&ws=nginx
- Fedora EPEL package metadata for certbot on EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html
- Red Hat blog guidance for installing EPEL on RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- OpenSSL req documentation: https://docs.openssl.org/3.1/man1/openssl-req/
- OpenSSL s_client documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/

## Issues Found
- The self-signed certificate command only set the Common Name. Modern hostname validation expects Subject Alternative Name entries, so I added `-addext "subjectAltName=DNS:www.example.com"`.
- The Diffie-Hellman parameter step said it strengthened key exchange, but the original Nginx cipher list did not allow DHE cipher suites. I clarified that DH parameters apply when DHE cipher suites are allowed and added DHE AES-GCM suites to match the `ssl_dhparam` directive.
- The RHEL Certbot package install command assumed the Certbot packages were already available. On RHEL 9, the referenced RPM packages come from EPEL, so I added the CodeReady Builder enablement and EPEL release package install before installing `certbot` and `python3-certbot-nginx`.
- The TLS handshake diagram was too imprecise because it showed a generic client "Key Exchange" and only a server "Finished" message. I adjusted the labels to include key exchange data on both sides and the client's Finished message.
- The OCSP stapling snippet enabled `ssl_stapling_verify` without configuring trusted issuer certificates. I added `ssl_trusted_certificate /etc/letsencrypt/live/www.example.com/chain.pem;` so Nginx has a trust chain for stapling verification.

## Review Notes
- Certbot's official recommended installation method for many Linux distributions is snap, while EPEL packages are a common RPM-based option for RHEL-compatible systems. The post now makes the EPEL dependency explicit for its `dnf` workflow.
- The HSTS example includes `includeSubDomains`; this is technically valid, but operators should only use it when every subdomain is HTTPS-ready.
