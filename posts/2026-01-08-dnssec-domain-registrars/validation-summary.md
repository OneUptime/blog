# Validation Summary: How to Enable DNSSEC on Your Domain with Popular Registrars

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- DNSSEC (DS records, DNSKEY, KSK/ZSK, chain of trust)
- Cloudflare DNS + Cloudflare API (DNSSEC endpoint)
- AWS Route 53 (DNSSEC signing, KMS, AWS CLI)
- GoDaddy DNS + GoDaddy Domains API
- Namecheap DNS / DS record management
- Google Domains / Squarespace Domains
- BIND DNSSEC tooling: `dig`, `delv`, `dnssec-dsfromkey`, `dnsviz`

## Sources Consulted
- RFC 4034 (Resource Records for DNS Security Extensions) — DS, DNSKEY, RRSIG formats
- RFC 8624 / IANA DNSSEC algorithm & digest registries — algorithm numbers (8, 10, 13, 14, 15, 16) and digest types (1=SHA-1, 2=SHA-256, 4=SHA-384)
- Cloudflare API docs — `PATCH/GET /zones/{zone_id}/dnssec`
- AWS Route 53 DNSSEC documentation — `enable-hosted-zone-dnssec`, `create-key-signing-key`, `get-dnssec`, and the KMS key requirement (asymmetric ECC_NIST_P256 / SIGN_VERIFY in us-east-1)
- AWS CLI Route 53 command reference
- ISC BIND documentation for `delv` (`+rtrace`) and `dnssec-dsfromkey`
- GoDaddy Domains API reference
- DNSViz CLI documentation

## Issues Found
1. **Route 53 Step 1 — premature `enable-hosted-zone-dnssec` (technical error).**
   The original Step 1 ran `aws route53 enable-hosted-zone-dnssec` *before* a key-signing key existed (created in Step 2). Route 53 rejects enabling DNSSEC signing until a KSK (and its backing KMS key) is present, so the command would fail. Replaced Step 1 with the genuine first prerequisite — creating a customer managed asymmetric KMS key (`ECC_NIST_P256`, `SIGN_VERIFY`, `us-east-1`) via `aws kms create-key`. The flow is now correctly ordered: create KMS key → create KSK → enable signing, matching the "Complete AWS CLI Script" later in the post.

2. **Issue 2 "Key Tag Mismatch" — invalid `dnssec-keygen` usage (technical error).**
   The original command piped a DNSKEY string into `dnssec-keygen` to "calculate key tag." `dnssec-keygen` generates brand-new keys and does not compute a key tag from an existing DNSKEY, so the command was nonsensical and would not produce the intended result. Replaced it with the correct tool, `dnssec-dsfromkey`, which derives the DS record (whose first field is the key tag) from the published DNSKEY:
   `dig example.com DNSKEY > example.com.dnskey` then `dnssec-dsfromkey -2 -f example.com.dnskey example.com`.

## Review Notes
- Algorithm-number and digest-type reference tables are accurate against the IANA registries (alg 13 ECDSAP256SHA256 and 15 ED25519 correctly flagged as preferred; digest type 2 SHA-256 required, 1 SHA-1 deprecated).
- The Cloudflare API example response includes both `digest_type` and `digest_algorithm` fields; in Cloudflare's actual response `digest_type` is the numeric value (`"2"`) while `digest_algorithm` is `"SHA256"`. This is illustrative/cosmetic and was left as-is.
- The Route 53 numbered "Step" headings and the standalone "Complete AWS CLI Script" overlap somewhat; left intact to avoid restructuring since both are now technically correct.
- The GoDaddy and Squarespace API snippets are illustrative; exact DNSSEC-via-API support at those registrars is limited and subject to change, but the request shapes shown are plausible and clearly marked as examples.
- `delv ... +rtrace` and the note that `dig +sigchase` was removed (delv is the replacement) are accurate for modern BIND.
- `example.com` is shown resolving to `93.184.216.34`; this is a documentation-only example address and its real value has since changed, but it does not affect the correctness of the commands.
- DS record propagation guidance (24–48 hours) and verification tooling (`dig`, `delv`, DNSViz) are all sound.
