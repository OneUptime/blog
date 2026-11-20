# Validation Summary: Publish and Verify SSH Host Fingerprints with DNSSEC and SSHFP

## Status

validated

## Post Type

Technical tutorial and security configuration guide.

## Technologies Covered

- SSH and OpenSSH client host authentication
- SSHFP DNS resource records
- DNSSEC validation, trust anchors, DS, DNSKEY, RRSIG, and AD signaling
- Ed25519 host keys and SHA-256 fingerprints
- BIND DNS tools: dig and delv
- OpenSSH known-hosts databases and host-key revocation

## Sources Consulted

- [RFC 4255: Using DNS to Securely Publish Secure Shell (SSH) Key Fingerprints](https://www.rfc-editor.org/rfc/rfc4255.html) — record structure, fingerprint authentication, hostname ownership, and absence of a port field.
- [RFC 7479: Using Ed25519 in SSHFP Resource Records](https://www.rfc-editor.org/rfc/rfc7479.html) — algorithm identifier 4.
- [RFC 6594: SHA-256 in SSHFP Resource Records](https://www.rfc-editor.org/rfc/rfc6594.html) — fingerprint type 2 and SHA-256 representation.
- [RFC 4033: DNS Security Introduction and Requirements](https://www.rfc-editor.org/rfc/rfc4033.html) — DNSSEC scope, security states, and last-hop considerations.
- [RFC 4035, section 4.9.3](https://www.rfc-editor.org/rfc/rfc4035.html#section-4.9.3) — requirements for trusting a resolver's AD indication.
- [OpenSSH 9.9p2 release notes](https://www.openssh.org/txt/release-9.9p2) — CVE-2025-26465 fix and affected versions.
- [ssh-keygen manual](https://man.openbsd.org/ssh-keygen) — SSHFP generation using -r and -f.
- [ssh-keyscan manual](https://man.openbsd.org/ssh-keyscan) — -D output and lack of key authentication.
- [ssh_config manual](https://man.openbsd.org/ssh_config) — configuration precedence, DNS verification policy, strict checking, connection sharing, known-hosts sources, and revocation.
- [ssh manual](https://man.openbsd.org/ssh) — command syntax, diagnostic verbosity, command-line options, and configuration inspection.
- [OpenSSH 10.3p1 dns.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/dns.c), inspected through its [raw source](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/dns.c) — validated-result flag, fingerprint comparisons, and diagnostics.
- [OpenSSH 10.3p1 sshconnect.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c), also inspected through its [raw source](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/sshconnect.c) — revocation, DNS acceptance, and known-hosts fallback order.
- [BIND DNSSEC Guide](https://bind9.readthedocs.io/en/stable/dnssec-guide.html) — signed updates, manual signing, delegation, and chain maintenance.
- [BIND manual pages](https://bind9.readthedocs.io/en/stable/manpages.html#delv-dns-lookup-and-validation-utility) — dig DNSSEC requests, delv validation, trust anchors, and +vtrace.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Confirmed the CVE-2025-26465 affected range of 6.8p1 through 9.9p1 and the upstream fix in 9.9p2. The advice to check vendor backports is appropriate.
- Verified the SSHFP owner and zone-file syntax, Ed25519 algorithm 4, SHA-256 type 2, and 64-character hexadecimal digest. The placeholder is explicitly identified as requiring replacement.
- Generated a temporary Ed25519 key outside the repository and ran the documented ssh-keygen record-generation pattern. Independently calculated SHA-256 over the decoded public-key blob and confirmed that it exactly matched the generated SSHFP 4 2 record. Temporary key material was removed automatically.
- Used the installed OpenSSH 10.3p1 client with ssh -G and an empty configuration to check parsing of all canary options without connecting to a server. The resulting configuration confirmed strict checking, DNS verification, the Ed25519-only algorithm, excluded known-hosts files, and disabled host-key updates.
- Checked the version-pinned source: secure DNS matches permit acceptance before ordinary known-hosts comparison; mismatch or lookup failure falls back to normal checks. RevokedHostKeys is checked before initial DNS acceptance, whereas known-hosts revocation markers belong to fallback processing.
- Confirmed that a failed comparable fingerprint clears the overall DNS match flag in the cited implementation. The warning about publishing different Ed25519/SHA-256 fingerprints together is accurate for this version.
- The distinction between requesting DNSSEC records, independently validating with delv, and securing the resolver path used by SSH is correct. DNSSEC does not provide confidentiality, and an unauthenticated remote AD claim does not establish trust.
- Reviewed the referenced technical URLs and their relevant documentation or source content. The GitHub dns.c page was unavailable through the browser fetch, so the corresponding official raw tagged source was used.
- No DNS records were published and no end-to-end DNSSEC-backed SSH login was performed: the post uses a placeholder hostname and supplies no controlled server or signed test zone. Actual resolver integration, debug evidence, user authentication, and deployment behavior must still be checked in the target environment as the post instructs.
