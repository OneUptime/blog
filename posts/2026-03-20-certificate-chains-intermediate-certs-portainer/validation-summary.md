# Validation Summary: How to Configure Certificate Chains and Intermediate Certs in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker
- TLS/SSL certificate chains
- OpenSSL
- Certbot / Let's Encrypt

## Sources Consulted
- Portainer documentation: Using your own SSL certificate with Portainer — https://docs.portainer.io/advanced/ssl
- Portainer documentation: CLI configuration options — https://docs.portainer.io/advanced/cli
- OpenSSL documentation: `openssl-verify` — https://docs.openssl.org/master/man1/openssl-verify/
- OpenSSL documentation: `openssl-s_client` — https://docs.openssl.org/master/man1/openssl-s_client/
- Certbot user guide — https://eff-certbot.readthedocs.io/en/stable/using.html
- Local runtime validation using `docker run --rm portainer/portainer-ce:sts --help`, a live Portainer CE container on `https://127.0.0.1:19443/api/status`, and OpenSSL 3.0.13 command behavior against synthetic and live certificates.

## Issues Found
- The original `openssl verify` example only passed the assembled chain file as the target certificate. In OpenSSL 3.x, that does not correctly provide intermediates for chain building. I changed it to verify the leaf certificate with `-untrusted`, `-show_chain`, and `-purpose sslserver`.
- The `docker run` example used Portainer's deprecated `--ssl` flag and also had an invalid shell line continuation because a comment followed a trailing backslash. I removed `--ssl`, fixed the command formatting, and aligned the image tag with Portainer's current official `portainer/portainer-ce:sts` example.
- The `openssl s_client` example did not send SNI. I added `-servername portainer.example.com` so the certificate check requests the correct certificate on SNI-based hosts.
- The AIA extraction snippet used `awk '{print $3}'`, which returns `-` for standard OpenSSL `CA Issuers - URI:...` output instead of the URL. I corrected the extraction and added a PEM conversion step because AIA downloads are often DER-encoded while Portainer expects PEM certificates.

## Review Notes
- Portainer's current documentation uses `--sslcert` and `--sslkey` for the web UI certificate. The separate `--tlscert` and `--tlskey` options are for Docker daemon connections, not for the Portainer web certificate.
- Portainer expects PEM-encoded certificates, and Certbot's `fullchain.pem` already contains the leaf certificate followed by the intermediate chain.
