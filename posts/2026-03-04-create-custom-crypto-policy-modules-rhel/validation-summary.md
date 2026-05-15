# Validation Summary: How to Create Custom Crypto Policy Modules on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- System-wide crypto policies
- Custom crypto policy modules
- OpenSSH crypto policy backend
- OpenSSL crypto policy backend

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Customizing system-wide cryptographic policies with subpolicies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/using-the-system-wide-cryptographic-policies_system-design-guide
- `update-crypto-policies(8)` manual page: https://www.mankier.com/8/update-crypto-policies
- `crypto-policies(7)` manual page, "Crypto Policy Definition Format": https://manpages.debian.org/unstable/crypto-policies/crypto-policies.7.en.html
- Upstream `NO-SHA1.pmod` example from redhat-crypto/fedora-crypto-policies: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/policies/modules/NO-SHA1.pmod
- Upstream RHEL 9 `FUTURE.pol` policy definition from redhat-crypto/fedora-crypto-policies: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/policies/FUTURE.pol

## Issues Found
- The SSH CBC example removed only selected CBC cipher names. Red Hat documents `cipher@SSH = -*-CBC` for disabling all CBC mode ciphers for SSH, so the module was changed to use that wildcard expression.
- The post did not mention the RHEL version requirement for scoped directives and wildcards. Added a concise note that `cipher@SSH` and wildcard values require RHEL 8.5 or later.
- The stronger module described "minimum 256-bit key sizes," which was imprecise because the example sets 3072-bit RSA and DH minimums and removes AES-128 ciphers. Updated the description and module comments accordingly.
- The SHA-1 signature removal listed only a few explicit signature algorithm names. Updated it to the documented wildcard form `sign = -*-SHA1` and added `sha1_in_certs = 0`, matching the upstream `NO-SHA1.pmod` behavior.
- The verification section used OpenSSL cipher output to validate an SSH-scoped policy. Replaced it with checks against `/etc/crypto-policies/state/CURRENT.pol` and the generated OpenSSH backend configuration files.

## Review Notes
The examples assume systems where custom subpolicies are supported. Red Hat documents custom policy support from RHEL 8.2, with scoped policies and wildcard matching available from RHEL 8.5 and newer. Applying policy changes may require restarting affected applications or rebooting for already-running services to load regenerated backend configuration.
