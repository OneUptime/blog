# Validation Summary: How to Set Up HAProxy with SSL Termination on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- HAProxy
- SSL/TLS termination
- PEM certificates
- firewalld
- Certbot and Let's Encrypt
- OpenSSL

## Sources Consulted
- HAProxy documentation, Basics of enabling TLS: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/basics-enable-tls/
- HAProxy documentation, Global TLS settings: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/global-tls-settings/
- HAProxy documentation, HTTP redirects: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/http-redirects/
- HAProxy configuration manual, latest: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld Open a Port or Service guide: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- Certbot user guide, standalone plugin and renewal hooks: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot HAProxy instructions: https://certbot.eff.org/instructions?os=snap&tab=standard&ws=haproxy

## Issues Found
- The original PEM creation examples used `sudo cat ... > /etc/haproxy/certs/site.pem`. The output redirection is performed by the caller's shell, not by `sudo`, so this can fail when writing to `/etc/haproxy/certs`. Updated the commands to run the `cat` and redirection inside a root shell with `sudo sh -c`.
- The original Step 1 attempted to write `/etc/haproxy/certs/site.pem` before creating `/etc/haproxy/certs`. Moved directory creation before the first PEM write.
- The Let's Encrypt PEM combine command had the same `sudo cat ... >` redirection issue. Updated it to use `sudo sh -c` so the redirect has root privileges.

## Review Notes
- The HAProxy TLS directives, `bind ... ssl crt`, HTTP-to-HTTPS redirect, HSTS response header, `X-Forwarded-Proto` header, SNI certificate directory usage, TCP passthrough example, firewalld commands, Certbot standalone flow, and Certbot deploy hook location are consistent with the checked documentation.
- Certbot's official instructions currently recommend snap installation for most users, while RHEL package availability depends on enabled repositories. The post's `dnf install -y certbot` command may require the appropriate RHEL/EPEL repository setup in a real environment, but the command itself is valid where that package is available.
