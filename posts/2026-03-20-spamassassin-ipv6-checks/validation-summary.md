# Validation Summary: How to Configure SpamAssassin for IPv6 Checks

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache SpamAssassin
- spamd and spamc
- IPv6 CIDR configuration
- DNSBL/RBL checks
- SpamAssassin welcomelist configuration
- Ubuntu/Debian package and systemd service configuration

## Sources Consulted
- Apache SpamAssassin 4.0 `Mail::SpamAssassin::Conf` documentation: https://spamassassin.apache.org/full/4.0.x/doc/Mail_SpamAssassin_Conf.html
- Apache SpamAssassin 4.0 `Mail::SpamAssassin::Plugin::DNSEval` documentation: https://spamassassin.apache.org/full/4.0.x/doc/Mail_SpamAssassin_Plugin_DNSEval.html
- Apache SpamAssassin 4.0 `spamd` documentation: https://spamassassin.apache.org/full/4.0.x/doc/spamd.html
- Apache SpamAssassin 4.0 `spamassassin` command documentation: https://spamassassin.apache.org/full/4.0.x/doc/spamassassin-run.html
- Apache SpamAssassin 4.0 `sa-update` documentation: https://spamassassin.apache.org/full/4.0.x/doc/sa-update.html
- Ubuntu Noble `spamd` package information: https://launchpad.net/ubuntu/noble/%2Bpackage/spamd
- Debian Trixie `spamd` package file list: https://packages.debian.org/trixie/all/spamd/filelist
- Local Ubuntu package metadata and downloaded package contents for `spamassassin`, `spamc`, and `spamd` version `4.0.0-8ubuntu5`.

## Issues Found
- The installation command installed `spamassassin spamc` but then enabled a daemon service. On current Ubuntu/Debian packaging, `spamd` is a separate package and the systemd unit is `spamd.service`, so the install and service commands were updated to include `spamd` and use `systemctl ... spamd`.
- The post used `whitelist_from_rcvd` examples as plain IPv6 IP matching. SpamAssassin 4.x uses `welcomelist_from_rcvd` as the current directive, and IPv6 relay IPs for that directive must be enclosed in square brackets. The examples were changed to valid `welcomelist_from_rcvd` entries with a single IPv6 address and a CIDR range.
- The DNSBL example redefined SpamAssassin's built-in `RCVD_IN_XBL` rule and pointed it directly at `xbl.spamhaus.org`. SpamAssassin's packaged rules already define `RCVD_IN_XBL` through Spamhaus ZEN, so the example was changed to adjust the built-in score instead of redefining the rule.
- The command for checking active DNSBL-related plugins could include commented lines because recursive `grep` prefixes filenames. It was replaced with a `grep -RhE` command that matches active `loadplugin` lines for `DNSEval` and `URIDNSBL`.
- The `sa-update --debug` command was described as verbose mode. The official verbose flag is `-v`, so the command was updated.
- The debug command used `-D network`, which is not the relevant SpamAssassin debug channel for relay trust parsing. It was replaced with `received-header`, `config`, `dns`, and `dnseval` debug channels.
- The spamd IPv6 example edited the old `/etc/default/spamassassin` path, used the wrong service name, used fragile `--listen` syntax, and did not allow remote IPv6 spamc clients. It now edits `/etc/default/spamd`, uses bracketed IPv6 `--listen=[::]:783`, restarts `spamd`, and includes `--allowed-ips`.

## Review Notes
The example IPv6 ranges use `2001:db8::/32`, which is the documentation prefix and must be replaced with real local ranges. The local `spamassassin` executable was not installed in the workspace, so commands were verified against Apache documentation plus Ubuntu package metadata and downloaded package contents rather than by running `spamassassin --lint`.
