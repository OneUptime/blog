# Validation Summary: How to Enable DNSSEC on Google Cloud DNS

## Status
validated

## Post Type
Tutorial / Guide (step-by-step, CLI + Console + Terraform)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- Google Cloud DNS (Cloud DNS managed zones)
- gcloud CLI (`gcloud dns ...`)
- Google Cloud Console
- Terraform (`google_dns_managed_zone`)
- `dig` for DNS/DNSSEC verification
- Domain registrar DS record management (Google Domains, Namecheap, GoDaddy, Cloudflare)

## Sources Consulted
- Google Cloud DNS — DNSSEC config overview: https://cloud.google.com/dns/docs/dnssec-config
- Google Cloud DNS — Advanced DNSSEC (algorithms, defaults, NSEC3): https://cloud.google.com/dns/docs/dnssec-advanced
- gcloud reference — `dns managed-zones create`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- gcloud reference — `dns managed-zones update`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/update
- gcloud reference — `dns dns-keys list`: https://cloud.google.com/sdk/gcloud/reference/dns/dns-keys/list
- gcloud reference — `dns operations list`: https://cloud.google.com/sdk/gcloud/reference/dns/operations/list

## Issues Found

1. **Incorrect default DNSSEC algorithm (Step 3).** The post stated that enabling DNSSEC with a plain `--dnssec-state on` uses the default algorithm **ECDSAP256SHA256**. Per Google's documentation, the Cloud DNS default is **RSASHA256** (2048-bit KSK, 1024-bit ZSK). This also made the Step 5 verification output (which shows ECDSAP256SHA256) inconsistent with a default enable.
   - **Fix:** Rewrote Step 3 to note that the default is RSASHA256 and to show enabling DNSSEC with the recommended ECDSAP256SHA256 algorithm explicitly via the `--ksk-algorithm`/`--zsk-algorithm`/key-length flags (which keeps the rest of the post's ECDSAP256SHA256 outputs consistent), plus a short example of the plain default-RSASHA256 form.

2. **Misleading claim that algorithms can be changed via `update` on an enabled zone (Step 4).** The post implied you can reconfigure key algorithms with `gcloud dns managed-zones update` at any time. Cloud DNS does not allow changing key specifications on a zone that already has DNSSEC enabled; you must disable and re-enable.
   - **Fix:** Reworded Step 4 to explain that algorithms are set in the same command that enables DNSSEC and that switching later requires disabling then re-enabling DNSSEC.

3. **Invalid manual-rollover procedure (Manual Key Rollover).** The example "initiated a KSK rollover" by running `update --dnssec-state on --ksk-algorithm ...` on an already-enabled zone, which does not change key specs / trigger a rollover.
   - **Fix:** Replaced with the correct disable-then-re-enable-with-new-settings procedure.

4. **Non-existent CLI flag `--show-deleted` (Key Rotation).** `gcloud dns dns-keys list` does not support a `--show-deleted` flag (verified against the command reference; it supports only `--zone`, `--filter`, `--limit`, `--sort-by`, and the global flags). `dns-keys list` already lists all keys (active and inactive).
   - **Fix:** Removed the invalid flag and updated the comment.

## Review Notes
- Verified the algorithm reference tables: RSASHA1 (5), RSASHA256 (8), RSASHA512 (10), ECDSAP256SHA256 (13), ECDSAP384SHA384 (14) are all correct algorithm numbers, and `rsasha1`/`rsasha256`/`rsasha512`/`ecdsap256sha256`/`ecdsap384sha384` are all accepted gcloud mnemonics. RSASHA1 is correctly flagged as legacy.
- Verified DNSSEC state values `off`/`on`/`transfer` are valid for `--dnssec-state`.
- Verified NSEC3 is the documented default denial-of-existence type.
- Verified `gcloud dns operations list` correctly uses the `--zones` (plural) flag as written in the post.
- The `dig` DNSKEY/DS/RRSIG sample outputs use plausible, illustrative placeholder values and correct record formats (DNSKEY flags 256=ZSK / 257=KSK, DS = keytag/algorithm/digest-type/digest).
- The Terraform `google_dns_managed_zone` `dnssec_config` block (state, `default_key_specs`, `non_existence`) matches the provider schema.
- Minor (not changed): the NSEC3PARAM sample shows 1 iteration; current best practice (RFC 9276) favors 0 iterations, but the sample is illustrative and not incorrect for Cloud DNS.
