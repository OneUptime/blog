# Validation Summary: How to Set Up Certificate-Based IPsec Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- strongSwan
- IPsec
- IKEv2
- X.509 certificates
- PKI and CRLs
- Linux
- `swanctl`
- `pki`

## Sources Consulted
- strongSwan Documentation, Introduction to strongSwan: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Documentation, Configuration Files: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Documentation, What’s New in strongSwan 6.0: https://docs.strongswan.org/docs/latest/news/whatsNew.html
- strongSwan Documentation, `swanctl.conf`: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan Documentation, `swanctl` Directory: https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- strongSwan Documentation, `swanctl --load-all`: https://docs.strongswan.org/docs/latest/swanctl/swanctlLoadAll.html
- strongSwan Documentation, `swanctl --list-sas`: https://docs.strongswan.org/docs/latest/swanctl/swanctlListSas.html
- strongSwan Documentation, `charon-systemd`: https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- strongSwan Documentation, Certificates Quickstart: https://docs.strongswan.org/docs/latest/pki/pkiQuickstart.html
- strongSwan Documentation, `pki --issue`: https://docs.strongswan.org/docs/latest/pki/pkiIssue.html
- strongSwan Documentation, `pki --signcrl`: https://docs.strongswan.org/docs/latest/pki/pkiSignCrl.html
- strongSwan Documentation, `pki --self`: https://docs.strongswan.org/docs/latest/pki/pkiSelf.html
- strongSwan Documentation, `pki --req`: https://docs.strongswan.org/docs/latest/pki/pkiReq.html

## Issues Found
- The post used the deprecated `ipsec.conf` / `ipsec.secrets` / `ipsec` (`stroke`) workflow. I replaced it with the current `swanctl.conf` and `swanctl` workflow because strongSwan documents `swanctl`/VICI as the modern interface and marks the legacy `stroke` interface as deprecated and no longer built by default.
- The PKI examples used the legacy `/etc/ipsec.d/...` credential paths. I updated them to the current `/etc/swanctl/...` directory layout documented for the `swanctl`-based setup.
- The certificate issuance example referenced Gateway B files later in the post without making it explicit that Gateway B must be issued separately. I clarified that Gateway B must be generated the same way with its own filenames, DN, and SAN.
- The verification steps used `ipsec up` and `ipsec statusall`, which are tied to the deprecated control path. I replaced them with `swanctl --load-all` and `swanctl --list-sas`.
- The CRL example used `ipsec pki --gen-crl`, which is not a valid strongSwan `pki` command. I replaced it with `pki --signcrl`, added a revocation reason, updated the CRL path to `/etc/swanctl/x509crl`, and noted the need for `--lastcrl` when updating an existing CRL.
- The closing line claimed "immediate revocation capability." I changed that wording because certificate revocation only becomes effective after CRL distribution and credential reload, or successful online revocation retrieval.

## Review Notes
- The tutorial is now aligned with the modern strongSwan 6.x configuration and control workflow.
- The post still reflects a simplified lab flow. In production, the CA private key should be kept on a dedicated CA/admin host instead of a VPN gateway.
- On distributions that still install the legacy starter backend, service names and package selection may differ. The validated instructions assume the modern `charon-systemd` plus `swanctl` setup that uses `strongswan.service`.
