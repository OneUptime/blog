# Validation Summary: How to Use wpscan for WordPress Security Scanning on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- WPScan (Ruby-based WordPress security scanner)
- WordPress
- Ubuntu (apt package manager)
- Ruby / RubyGems
- Docker
- Bash shell scripting
- jq (JSON parser)

## Sources Consulted
- WPScan GitHub repository README: https://github.com/wpscanteam/wpscan
- WPScan source code — `app/controllers/core.rb`, `app/controllers/enumeration.rb`, `app/controllers/enumeration/cli_options.rb`, `app/controllers/enumeration/enum_methods.rb`, `app/controllers/password_attack.rb`
- CMSScanner base library — `app/controllers/core/cli_options.rb` (the parent project from which WPScan inherits CLI defaults)
- WPScan API token registration: https://wpscan.com/register
- Docker Hub: `wpscanteam/wpscan` image

## Issues Found

1. **Incorrect password-attack flag name** — The "Password Brute Forcing" section used `--username` (singular) in three of the four examples. WPScan only accepts `--usernames` (plural) / `-U` — there is no `--username` option, so the commands as written would fail. Fixed by changing all three occurrences to `--usernames`. (Source: `app/controllers/password_attack.rb` — `OptSmartList.new(['--usernames LIST', '-U', ...])`.)

2. **Inaccurate "basic scan checks" list** — The original list claimed that a default `wpscan --url ...` invocation (without `--enumerate`) checks "Active plugins (visible ones)" and performs "User enumeration." Neither is correct: `enum_plugins?` in `app/controllers/enumeration/enum_methods.rb` returns `false` unless `--enumerate` includes a plugin choice or `--plugins-list` is supplied, and user enumeration is similarly opt-in via `--enumerate u`. Removed those two bullets, added a "response headers / exposed paths / wp-cron" bullet to reflect what `interesting_findings` actually reports, and added a clarifying note that plugin and user enumeration require `--enumerate`.

## Review Notes

- The `WPSCAN_API_TOKEN` environment variable usage shown in the "Getting a WPScan API Token" section is correct — WPScan has natively read this env var since v3.7.10.
- The "Mixed (default)" label under Plugin Detection Modes is technically accurate by inheritance: `--plugins-detection` has no explicit default in WPScan's CLI options, but `enum_methods.rb` falls back to `--detection-mode` (which defaults to `mixed`) when no per-type mode is set.
- `--max-threads` default of 5, `--request-timeout` of 60s, `--throttle` in milliseconds, and the `--update` / `--[no-]update` flag are all confirmed against the CMSScanner / WPScan source.
- The `--enumerate` short codes (`vp`, `vt`, `u`, `tt`, `cb`, `dbe`, `ap`, `at`, `p`, `t`) and the `u[1-100]` range syntax are all valid.
- `WPVulnDB` is the legacy name for what is now branded as the "WPScan WordPress Vulnerability Database." The term is still widely recognized, so left as-is.
- The Docker example uses `-it`, which will fail in non-TTY contexts (cron, CI). Not technically incorrect for interactive use as documented, but worth flagging for readers running it in pipelines.
- The CVE reference in the "Plugin Vulnerabilities" example block is intentionally placeholder text (`CVE-2023-XXXX`) and is presented as sample output, so no fix needed.
