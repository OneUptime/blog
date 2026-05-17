# Validation Summary: How to Use Ubuntu Pro for FIPS Compliance

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Pro (`pro` CLI / ubuntu-pro-client)
- FIPS 140-2 / FIPS 140-3 cryptographic modules
- OpenSSL (1.1 on 20.04, 3.x on 22.04+) and FIPS provider
- Linux kernel `fips=1` boot parameter / `crypto.fips_enabled` sysctl
- OpenSSH (`sshd_config` cipher/MAC/KEX/HostKey options)
- APT package pinning (`apt-mark hold`, `/etc/apt/preferences.d`)

## Sources Consulted
- Ubuntu Pro Client documentation — Enable FIPS: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/enable_fips/
- Ubuntu Pro Client documentation — Status columns: https://documentation.ubuntu.com/pro-client/en/latest/explanations/status_columns/
- Canonical blog — Ubuntu 22.04 FIPS 140-3 modules: https://ubuntu.com/blog/ubuntu-22-04-fips-140-3-modules-available-for-preview
- canonical/ubuntu-pro-client issue tracker (notably #59 on disabling FIPS)
- NIST SP 800-131A Rev. 2 — Transitioning the Use of Cryptographic Algorithms and Key Lengths
- OpenSSL 3.x FIPS provider documentation and error format discussion (openssl/openssl#24397)
- OpenSSH manual pages (`sshd_config(5)`) for supported algorithm names

## Issues Found
1. **`pro status | grep -i "machine is"` is unreliable.** The phrase "This machine is attached to ..." is emitted by `pro attach`, not `pro status`. For an attached system, `pro status` prints the SERVICE/ENTITLED/STATUS table plus Account/Subscription/Valid until footer — the grep would silently match nothing. For an unattached system, output includes "This machine is not attached to ..." which would match but means the opposite. Replaced with a plain `pro status` invocation plus a programmatic JSON-based check (`pro status --format json | grep -o '"attached": true'`).

2. **`hmac-sha1` listed as FIPS-compliant for SSH MACs is incorrect.** HMAC-SHA1 for MAC generation is disallowed under NIST SP 800-131A Rev. 2. Removed `hmac-sha1` from the `MACs` line and added a comment explaining why.

3. **OpenSSL error message only showed the 1.1 format.** Ubuntu 22.04 LTS and 24.04 LTS ship OpenSSL 3.x, whose FIPS error format is different (uses `Properties ()` and `inner_evp_generic_fetch:unsupported`). Updated the example to show both 1.1 and 3.x error formats with a note about which Ubuntu version produces which.

4. **Missing `fips-preview` service.** Ubuntu Pro now offers three FIPS-related services, not two: `fips`, `fips-updates`, and `fips-preview` (the latter for modules in NIST's recertification queue, used for newer LTS releases pre-certification). Added the third bullet and a note that Canonical recommends `fips-updates` over `fips` for most production use.

5. **"Disabling FIPS" section understated the rollback problem.** `sudo pro disable fips` only removes the Pro APT sources — it does NOT uninstall the FIPS packages or revert the kernel. Canonical does not provide a clean disable path (tracked in canonical/ubuntu-pro-client#59). Added a sentence making this explicit.

Also retained prior in-place fixes from earlier diff review: case-insensitive grep adjustment, lowercased `fips` in the OpenSSL 1.x error string, replacement of deprecated `ssh-rsa` with `rsa-sha2-256,rsa-sha2-512` in `HostKeyAlgorithms`, and shell-quoting of `'libssl*'` in `apt-mark hold`.

## Review Notes
- The `apt-mark hold openssl 'libssl*'` example may still fail because `apt-mark hold` takes literal package names, not globs. A more robust pattern is to enumerate matching installed packages with `dpkg -l 'libssl*'` and pin each by name. Not changed because it is illustrative and the behavior on a given system depends on which libssl is present.
- The apt pinning example uses `libssl1.1` and `focal-security` — this is Ubuntu 20.04 specific. On 22.04 it would be `libssl3` with `jammy-security`, and on 24.04 `noble-security`. The example is realistic for 20.04 but readers on newer LTS need to substitute.
- AES-CBC remains FIPS-approved generally, but FIPS-hardened SSH guidance (RHEL crypto policies, DISA STIGs) typically drops CBC in favor of CTR/GCM. The post's inclusion of `aes*-cbc` is acceptable but not the most conservative choice.
- The `openssl genrsa 2048` command is deprecated in OpenSSL 3.x (still works with a warning); `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048` is the modern equivalent. Not changed — `genrsa` still functions and is more readable for a tutorial.
- The audit script writes to `/var/compliance/` without first creating the directory; a `mkdir -p` would make the snippet runnable as-is.
