# Validation Summary: How to Configure SpamAssassin on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SpamAssassin (spamd, spamc, sa-learn, sa-update, sa-compile)
- Ubuntu 22.04 / 24.04 LTS
- Postfix (content_filter integration)
- Amavisd-new
- Bayesian filtering
- Razor2 and Pyzor collaborative filtering plugins
- DCC plugin
- systemd (service units and resource limits)
- logrotate, cron

## Sources Consulted
- SpamAssassin 4.0.x configuration reference (`Mail::SpamAssassin::Conf`): https://spamassassin.apache.org/full/4.0.x/doc/Mail_SpamAssassin_Conf.html
- SpamAssassin DCC plugin docs (`Mail::SpamAssassin::Plugin::DCC`): https://spamassassin.apache.org/full/4.0.x/doc/Mail_SpamAssassin_Plugin_DCC.html
- Debian/Ubuntu amavisd-new `15-content_filter_mode` default behavior (Ubuntu community wiki PostfixAmavisNew and related): https://help.ubuntu.com/community/PostfixAmavisNew

## Issues Found
1. **Invalid `skip_dcc_check 1` directive** (Performance Optimizations section). SpamAssassin has no `skip_dcc_check` configuration option. The documented way to disable DCC is `use_dcc 0` (from the DCC plugin). Changed the line to `use_dcc 0`. (The adjacent `score DCC_CHECK 0` was left intact.)

2. **Invalid `dns_timeout 5` directive** (Performance Optimizations section). `dns_timeout` is not a real SpamAssassin directive — DNS/RBL query timeouts are controlled by `rbl_timeout`, which the snippet already sets correctly (`rbl_timeout 15`) a few lines later. Removed the invalid `# Reduce DNS timeout` / `dns_timeout 5` lines to avoid a lint failure and a contradictory duplicate.

3. **Misused `dns_query_restriction allow` directive** (Performance Optimizations section). The real syntax is `dns_query_restriction (allow|deny) domain1 domain2 ...` and it restricts which domains DNS lookups are made for — it does not "enable parallel DNS queries" (SpamAssassin already performs DNS lookups in parallel by default). Using `allow` with no domain is incomplete/non-functional. Removed the misleading comment and directive.

4. **Invalid `_PROCESSING_TIME_` template tag** (Logging Configuration section). SpamAssassin does not define a `_PROCESSING_TIME_` add_header template tag, so `add_header all Processing-Time _PROCESSING_TIME_ seconds` would emit a literal unexpanded tag. Removed that header line and its comment.

5. **Incorrect comment on `blacklist_to`** (Whitelist/Blacklist section). The comment read "Blacklist specific sending hosts," but `blacklist_to` blacklists messages addressed *to* a given local recipient, not based on the sending host. Corrected the comment to "Blacklist mail sent to a specific local recipient address."

## Review Notes
- **Amavis bypass logic (verified correct, not changed):** The `15-content_filter_mode` snippet instructs the reader to *uncomment* `@bypass_spam_checks_maps` "to enable spam checking." This is counterintuitive but matches Debian/Ubuntu amavisd-new's own shipped convention ("Uncomment the two lines below to enable it back") — the referenced bypass maps default to empty, so assigning them re-enables checking. Left as-is.
- **`bayes_store_module Mail::SpamAssassin::BayesStore::DBM` comment:** The comment calls this "Berkeley DB." The DBM backend uses a tied DBM library (typically SDBM/GDBM via AnyDBM), not specifically Berkeley DB. The directive itself is valid; only the descriptive comment is loosely worded. Not changed.
- **systemd `MemoryLimit`/`CPUQuota`:** `MemoryLimit=` is a deprecated compatibility alias for `MemoryMax=` in modern systemd; it still works but `MemoryMax=`/`MemoryHigh=` are the current names. Left as-is since it remains functional.
- **`/etc/default/spamassassin`:** This SysV-era options file is still honored by the Debian/Ubuntu `spamassassin.service` unit via its EnvironmentFile, so the `OPTIONS=`/`CRON=` approach remains valid on 22.04/24.04. The `ENABLED=1` line is a legacy no-op under systemd but is harmless.
- **`multi.uribl.com` custom URIBL rule:** Functional, but URIBL's multi datafeed requires registration/DNS datafeed access for non-trivial query volumes — operators may need an account. Informational only.
- All CLI commands (`sa-learn`, `sa-update`, `sa-compile`, `spamc`, `razor-admin`, `pyzor`), package names, custom rule syntax (header/body/uri/meta), and Postfix `master.cf`/`main.cf` integration were verified and are correct.
