# Validation Summary: How to Obtain Let's Encrypt Certificates via IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Let's Encrypt
- Certbot
- ACME challenge types (`http-01` and `dns-01`)
- IPv6
- Nginx
- TLS/SSL
- Cloudflare DNS plugin

## Sources Consulted
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot FAQ: https://certbot.eff.org/faq/
- Certbot Instructions: https://certbot.eff.org/instructions
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The prerequisite check said that `ping6` to the ACME API confirmed Let's Encrypt could reach the server. That was inaccurate; it only tests outbound connectivity. I changed it to an outbound IPv6 check against the ACME directory endpoint and clarified that the domain's `AAAA` record must point to the host serving the ACME challenge.
- The standalone-mode note claimed Certbot binds to `[::]:80` by default. I replaced that with the documented requirement that the standalone server must be reachable on port 80 for HTTP-01 validation.
- The Cloudflare automation example used a generic `pip install certbot-dns-cloudflare`, which can fail if the plugin is not installed into the same environment as Certbot. I replaced it with a current snap-based example and clarified that plugin installation depends on how Certbot was installed.
- The Nginx snippet used `listen ... http2`, which current NGINX documentation marks as deprecated. I updated it to `listen ... ssl;` plus `http2 on;`.
- The renewal section implied users should add a scheduler unconditionally. I changed it to match Certbot's documented behavior that most installations already configure automatic renewal, added checks for existing timers or cron jobs, and kept the cron example only for cases where no scheduler exists.
- The renewal guidance did not mention that certificates obtained with `--manual` do not auto-renew unless hook scripts are provided. I added that caveat.
- The verification commands were updated to use an explicit IPv6 `curl` request plus `openssl x509 -noout -subject -issuer -dates`, which reliably exposes the certificate metadata being checked.

## Review Notes
- Certbot's official Linux instructions currently prefer snap-based installs in many environments. The post still uses distro packages for the base client, which remains a common approach, but a future revision could align the entire article to one installation method end-to-end.
