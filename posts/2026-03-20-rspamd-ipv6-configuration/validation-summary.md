# Validation Summary: How to Configure Rspamd with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rspamd
- IPv6
- Postfix milters
- Rspamd worker configuration
- Rspamd multimap rules
- Rspamd RBL/DNSBL rules
- Spamhaus DNSBLs
- Ubuntu/Debian and RHEL-family package installation

## Sources Consulted
- Rspamd Installation Guide: https://docs.rspamd.com/getting-started/installation/
- Rspamd Workers documentation: https://docs.rspamd.com/workers/
- Rspamd Proxy worker documentation: https://docs.rspamd.com/workers/rspamd_proxy/
- Rspamd MTA Integration tutorial: https://docs.rspamd.com/tutorials/integration/
- Rspamd Configuration Fundamentals: https://docs.rspamd.com/guides/configuration/fundamentals/
- Rspamd Multimap module: https://docs.rspamd.com/modules/multimap/
- Rspamd RBL module: https://docs.rspamd.com/modules/rbl/
- Spamhaus DQS Requests documentation: https://docs.spamhaus.com/datasets/docs/source/70-access-methods/data-query-service/040-dqs-queries.html
- Spamhaus Exploits Blocklist documentation: https://www.spamhaus.org/blocklists/exploits-blocklist/
- Postfix Milter README: https://www.postfix.org/MILTER_README.html
- Postfix `postconf(1)` manual: https://www.postfix.org/postconf.1.html
- Ubuntu `apt-key(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/man8/apt-key.8.html

## Issues Found
- The Ubuntu install command used deprecated `apt-key`, pinned the repository to Ubuntu focal, and installed only `rspamd`. Updated it to the current signed keyring method, dynamic `lsb_release -cs` distribution selection, and the Rspamd-documented Redis package.
- The RHEL/CentOS install command used the CentOS 7 repository and `yum`. Updated it to the current RHEL-family 8+ repository path and `dnf` install command.
- The post implied that any IPv6 SMTP traffic requires changing Rspamd worker listener bindings. Clarified that IPv6 listener binding is needed when Postfix or other clients connect to Rspamd over IPv6.
- The `local_networks` section said trusted internal networks would not be scored. Updated the wording to state that those networks are treated as local networks, which is what the option controls.
- The multimap whitelist section said the example bypassed spam checks, but the snippet applies a negative score. Updated the wording to describe the actual behavior.
- The custom RBL examples omitted `checks = ["from"];`, which Rspamd documents as a required RBL rule setting. Added it to both Spamhaus examples.
- The `ss` verification note expected `:::11332` and `:::11333`, which is not the only modern `ss` display format. Updated it to allow `*:` or `[::]:` listener output and added `sudo` so process details are visible.
- The `rspamc` test used a package-specific sample path that is not documented as portable. Replaced it with a generic saved RFC 5322 message file.
- The conclusion overstated IPv6 binding as a universal Rspamd support requirement. Reworded it to say Rspamd services can listen on IPv6 when the worker sockets are bound accordingly.

## Review Notes
Rspamd already ships default Spamhaus ZEN rules in typical installations, so adding separate SBL/XBL rules may duplicate scoring unless the administrator intentionally customizes the RBL set. Exposing the controller on `*:11334` should be paired with normal access controls such as firewalling, a reverse proxy, or TLS in production.
