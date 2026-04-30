# Validation Summary: How to Configure IPsec IPv6 with Certificates

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- IKEv2
- strongSwan
- X.509 certificates
- PKI
- Certificate revocation lists (CRLs)

## Sources Consulted
- strongSwan Certificates Quickstart: https://docs.strongswan.org/docs/latest/pki/pkiQuickstart.html
- strongSwan `pki --req`: https://docs.strongswan.org/docs/latest/pki/pkiReq.html
- strongSwan `pki --issue`: https://docs.strongswan.org/docs/latest/pki/pkiIssue.html
- strongSwan `pki --signcrl`: https://docs.strongswan.org/docs/latest/pki/pkiSignCrl.html
- strongSwan `swanctl.conf` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan `swanctl --initiate`: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan `swanctl --list-certs`: https://docs.strongswan.org/docs/latest/swanctl/swanctlListCerts.html
- strongSwan `swanctl` directory layout: https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- strongSwan IKE/IPsec SA renewal and reauthentication: https://docs.strongswan.org/docs/latest/config/rekeying.html
- strongSwan configuration syntax (`#` comments): https://docs.strongswan.org/docs/latest/config/strongswanConf.html
- strongSwan Windows certificate requirements (`serverAuth`, `ikeIntermediate`, SAN handling): https://docs.strongswan.org/docs/latest/interop/windowsCertRequirements.html

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:gw1::1` and `2001:db8:site1::/48`. These were replaced with valid documentation-prefix IPv6 addresses and prefixes.
- The `swanctl.conf` example used `!` inline comments and an invalid `ca =` key. The snippet was corrected to use valid `#` comments and `cacerts = ca.cert.pem`.
- The ESP proposal incorrectly included `prfsha256`, which is not part of ESP proposal syntax. It was corrected to `aes256gcm128-ecp256`.
- The verification commands used invalid `swanctl` syntax (`swanctl --list-certs --ca` and `swanctl --initiate conn:gw1-to-gw2`). These were corrected to `swanctl --list-certs --type x509 --flag ca` and `swanctl --initiate --child site-tunnel`.
- The CRL section used `openssl ca` commands that depend on an OpenSSL CA database/config and pointed to the wrong strongSwan CRL directory. It was replaced with strongSwan’s documented `pki --signcrl` workflow and the correct `/etc/swanctl/x509crl/` directory, plus `swanctl --load-creds`.
- The certificate rotation section used incomplete CA paths, an invalid IPv6 SAN example, and incorrectly implied that rekeying would switch the live tunnel to the new certificate. It was corrected to reload config and re-establish the IKE SA, because strongSwan rekeying does not re-check credentials.
- The GW2 certificate copy comment was misleading. It was clarified so the command reflects a CA-signed certificate being copied back after GW2 generates its CSR locally.

## Review Notes
- The tutorial now aligns with current strongSwan 6.x documentation for `pki`, `swanctl.conf`, and `swanctl` command syntax.
- `serverAuth` and `ikeIntermediate` EKUs were retained for interoperability, but they are primarily relevant for some third-party clients and are not strictly required for strongSwan-to-strongSwan authentication.
- strongSwan’s quickstart documentation warns against storing the CA private key on an Internet-facing VPN gateway. The post still uses an on-host CA for demonstration simplicity; production deployments should keep the CA key on a separate or offline CA system.
- Immediate certificate cutover in the revised rotation section is done by terminating and re-initiating the IKE SA. Truly seamless rollover requires planned reauthentication behavior and peer support.
