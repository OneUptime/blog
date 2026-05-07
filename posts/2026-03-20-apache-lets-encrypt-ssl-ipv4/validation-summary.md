# Validation Summary: How to Set Up Let's Encrypt SSL with Apache on an IPv4 Server

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Apache HTTP Server
- Let's Encrypt
- ACME
- Certbot
- Apache `mod_ssl`
- Apache virtual hosts
- TLS/HTTPS

## Sources Consulted
- Let's Encrypt: ACME Client Implementations https://letsencrypt.org/docs/client-options/
- Let's Encrypt: Challenge Types https://letsencrypt.org/docs/challenge-types/
- Certbot Instructions (Apache) https://certbot.eff.org/instructions?ws=apache
- Certbot User Guide https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot man page https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- Apache HTTP Server: `mod_ssl` https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache HTTP Server: Binding to Addresses and Ports https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server: Name-based Virtual Host Support https://httpd.apache.org/docs/current/vhosts/name-based.html
- Ubuntu package index: `python3-certbot-apache` https://packages.ubuntu.com/jammy/python3-certbot-apache
- Fedora Packages: `python3-certbot-apache` https://packages.fedoraproject.org/pkgs/certbot/python3-certbot-apache/epel-10.0.html

## Issues Found
1. The introduction called Certbot the "official" ACME client. Let's Encrypt documents Certbot as a recommended third-party ACME client, so I corrected that wording.
2. The post said Certbot creates a new SSL virtual host configuration. In practice, the Apache plugin may create or update configuration, so I changed that sentence to avoid overclaiming.
3. The generated Apache SSL example used `SSLCertificateChainFile` and `cert.pem`/`chain.pem`. Current Apache `mod_ssl` documentation marks `SSLCertificateChainFile` obsolete, and Certbot documentation shows Apache using `fullchain.pem` with `privkey.pem`, so I updated the config snippet.
4. The binding section incorrectly implied the certificate itself is restricted to one IPv4 address and only changed `<VirtualHost>`. Apache documents that socket binding is controlled by `Listen`, so I changed the section to refer to Apache binding and added the matching `Listen` directive.
5. The renewal section used `systemctl status certbot.timer`, which is not portable across all installation methods. Certbot's documentation recommends checking scheduled renewals via cron entries or `systemctl list-timers`, so I updated the command accordingly.
6. The key takeaway claiming renewal happens "every 60 days" was inaccurate. Certbot runs a scheduled renewal task periodically and renews only when a certificate is near expiry, so I corrected that summary.

## Review Notes
- The distro package commands shown in the post are still plausible based on Ubuntu and EPEL package indexes, but Certbot's current instruction generator may recommend a different installation method depending on the selected Linux distribution and version.
- The manual HTTP-to-HTTPS rewrite example is syntactically valid, but Certbot's Apache installer normally configures redirects automatically for `certbot --apache`.
- Local verification was limited to documentation review; Apache and Certbot binaries are not installed in this workspace, so validation relied on official documentation and package indexes rather than local command execution.
