# Validation Summary: How to Discover Untracked Certificates Before They Expire: Network Scanning vs CA Inventory

## Status
validated

## Post Type
Technical Guide

## Technologies Covered
- TLS and X.509 certificates
- Nmap and the `ssl-cert` NSE script
- Server Name Indication (SNI) and STARTTLS
- Certbot and ACME
- AWS Certificate Manager and the AWS CLI
- Certificate Transparency
- Public and private PKI certificate inventories
- IPv4, IPv6, UDP, and QUIC discovery coverage

## Sources Consulted
- Nmap `ssl-cert` NSE script documentation: https://nmap.org/nsedoc/scripts/ssl-cert.html
- Nmap `tls` NSE library documentation: https://nmap.org/nsedoc/lib/tls.html
- Nmap `sslcert` NSE library documentation: https://nmap.org/nsedoc/lib/sslcert.html
- Certbot certificate management documentation: https://eff-certbot.readthedocs.io/en/stable/using.html#managing-certificates
- Certbot command reference, including `--config-dir`: https://eff-certbot.readthedocs.io/en/stable/man/certbot.html
- AWS CLI `acm list-certificates` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/list-certificates.html
- AWS CLI `acm describe-certificate` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/describe-certificate.html
- AWS Certificate Manager overview: https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html
- Let's Encrypt Certificate Transparency documentation: https://letsencrypt.org/docs/ct-logs/
- RFC 5246, TLS 1.2: https://www.rfc-editor.org/rfc/rfc5246.html
- RFC 8446, TLS 1.3: https://www.rfc-editor.org/rfc/rfc8446.html
- RFC 8555, ACME: https://www.rfc-editor.org/rfc/rfc8555.html
- RFC 9000, QUIC transport: https://www.rfc-editor.org/rfc/rfc9000.html
- RFC 9001, TLS in QUIC: https://www.rfc-editor.org/rfc/rfc9001.html
- RFC 9162, Certificate Transparency 2.0: https://www.rfc-editor.org/rfc/rfc9162.html
- RFC 5280, Internet X.509 PKI certificate profile: https://www.rfc-editor.org/rfc/rfc5280.html
- RFC 7469 Section 2.4, consulted only for SPKI fingerprint construction (the HPKP mechanism itself is obsolete): https://www.rfc-editor.org/rfc/rfc7469.html#section-2.4
- RFC 7517, SHA-256 X.509 certificate thumbprints: https://www.rfc-editor.org/rfc/rfc7517.html#section-4.9
- RFC 9525, service identity in TLS: https://www.rfc-editor.org/rfc/rfc9525.html

## Issues Found

### 1. Mutual TLS and QUIC were described too broadly as network-scan blind spots
- **What was wrong:** The coverage table listed client-authenticated endpoints and UDP/QUIC as inherent blind spots. In ordinary TLS 1.2 and TLS 1.3 mutual-authentication handshakes, the server presents its certificate before client-certificate authentication completes, so requiring a client certificate does not by itself hide the server certificate. QUIC is also discoverable, but it requires a QUIC-aware probe over UDP rather than the TCP Nmap commands shown in the post.
- **What was changed:** Replaced those entries with “unsupported or unscanned transports such as QUIC over UDP” and added unscanned address families to the blind-spot description.
- **Why:** This distinguishes limitations of a particular scan plan or scanner from limitations of TLS certificate discovery itself.

### 2. Certbot inventory scope was attributed to an installation rather than a configuration directory
- **What was wrong:** The post said `certbot certificates` describes only that Certbot installation. Certbot's certificate state is selected through its configurable `--config-dir` option, whose default is `/etc/letsencrypt`; one installation can therefore operate against different configuration directories.
- **What was changed:** Clarified that the command describes only the certificates known in the Certbot configuration directory used for that invocation.
- **Why:** The revised wording reflects how Certbot actually locates and scopes its managed certificate lineages.

### 3. Nmap's `tls.servername` scope was described as if it were independently target-specific
- **What was wrong:** The post said the argument applies to “the scan target.” Nmap documents that `tls.servername` overrides the command-line target name used for SNI and affects every target in the invocation.
- **What was changed:** Clarified the invocation-wide scope and stated that probing multiple names on one IP typically requires one invocation per SNI name.
- **Why:** Without this distinction, a multi-target scan could incorrectly use the same SNI value for every target and miss name-based virtual hosts.

## Review Notes
- The Nmap commands are syntactically valid. The `ssl-cert` script is categorized as `default`, `safe`, and `discovery`; `-v` adds issuer information and certificate fingerprints; and Nmap's `sslcert` library supports STARTTLS for several common protocols.
- The AWS CLI commands use current options. `list-certificates` is paginated and scoped by account and region. Its default key-type and certificate-origin filters are restrictive, so the post's instruction to explicitly include every relevant type and origin is accurate. The AWS CLI auto-paginates unless pagination is disabled.
- The `certbot certificates` command and the described output fields were verified against current Certbot documentation.
- The Certificate Transparency discussion is accurate: CT logs are append-only, can contain certificate and precertificate entries, and provide issuance evidence rather than proof of deployment, reachability, current ownership, or ACME-account association.
- The use of a SHA-256 certificate fingerprint, issuer plus serial number, SPKI SHA-256, SANs, and endpoint plus SNI for different reconciliation purposes is technically sound. A service can select certificates based on additional ClientHello properties, so an endpoint-plus-SNI record should still be understood as an observation of one handshake.
- All external documentation links in the post resolved to the intended official resources during review.
