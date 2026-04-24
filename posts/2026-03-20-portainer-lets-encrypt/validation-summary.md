# Validation Summary: How to Use Let's Encrypt Certificates with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Let's Encrypt
- Certbot
- ACME
- Docker
- Nginx
- OpenSSL
- curl

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Portainer: CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer: Deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer: Using Portainer with reverse proxies: https://docs.portainer.io/advanced/reverse-proxy
- Portainer: Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot installation guidance: https://eff-certbot.readthedocs.io/en/stable/install.html
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- NGINX `ngx_http_proxy_module`: https://nginx.org/r/proxy_ssl_conf_command

## Issues Found
- The prerequisites incorrectly said HTTP-01 required both ports `80` and `443`. Let's Encrypt's official challenge documentation says HTTP-01 can only be performed on port `80`, so the prerequisite was corrected.
- The certificate issuance section told readers to stop Portainer to free ports `443/80`. In the guide's own Portainer setup, Portainer is exposed on `9443`, so that command was misleading. It was replaced with a generic note to stop whichever service is actually using port `80`.
- The Portainer startup command included `--ssl`, which Portainer documents as deprecated because HTTPS is enabled by default. The flag was removed.
- The renewal section used `systemctl status certbot.timer` and a simplified `/etc/cron.d/certbot` line. Certbot's current documentation recommends checking timers with `systemctl list-timers` and provides a randomized `certbot renew -q` cron example in `/etc/crontab`, so the commands were updated to match current guidance.
- The verification command used `openssl x509 -text | grep -E "Issuer:|Not After:"`. That grep pattern misses OpenSSL's actual `Not After :` output format, so the snippet could fail to display the expiry date. It was replaced with `openssl x509 -noout -issuer -enddate`, and SNI was added with `-servername`.
- The verification text hardcoded `Issuer: CN = R10`, which is not stable across Let's Encrypt certificate chains and key types. It was changed to a generic expectation that the issuer should be Let's Encrypt and `notAfter` should show the expiry date.
- The final `curl` example hit `/api/status`, which is less stable as a public validation target than the HTTPS endpoint itself. It was changed to `curl -I https://portainer.example.com:9443`.

## Review Notes
- Portainer's current documentation is slightly inconsistent around certificate flags: the custom SSL guide still documents `--sslcert` and `--sslkey`, while the deprecation page flags them for future replacement. The post was left aligned with Portainer's current SSL how-to because that is the product-specific certificate guide.
- Portainer's official nginx reverse-proxy guide uses a different deployment pattern from the post's manual Nginx example. The post's example is still technically workable for a same-host HTTPS upstream on `9443`, but it is not the same recipe as Portainer's documented `nginxproxy/nginx-proxy` example.
