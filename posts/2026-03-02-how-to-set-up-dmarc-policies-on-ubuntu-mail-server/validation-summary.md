# Validation Summary: How to Set Up DMARC Policies on Ubuntu Mail Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DMARC (RFC 7489)
- DNS TXT records
- SPF and DKIM (alignment)
- OpenDMARC (Postfix milter)
- OpenDKIM
- Postfix
- ARC (Authenticated Received Chain)
- `dig`, `xmllint`, `zcat`, `unzip`
- `parsedmarc` (Python)
- `Mail::DMARC::PurePerl` (CPAN)

## Sources Consulted
- RFC 7489 (DMARC) — tag semantics for `v`, `p`, `sp`, `rua`, `ruf`, `pct`, `adkim`, `aspf`, `fo`
- OpenDMARC documentation (`opendmarc.conf` directives: `Socket`, `Syslog`, `TrustedAuthservIDs`, `FailureReports`, `IgnoreAuthenticatedClients`, `HistoryFile`)
- Ubuntu opendkim.conf man page (jammy): https://manpages.ubuntu.com/manpages/jammy/man5/opendkim.conf.5.html
- PyPI: https://pypi.org/project/parsedmarc/ (confirmed real)
- PyPI search for `dmarc-report-analyzer` (confirmed NOT a real PyPI package)
- Ubuntu packages search for `libarc-perl` (confirmed NOT a real package)
- Ubuntu packages search for `openarc` (confirmed not packaged in Ubuntu repos)
- Ubuntu manpage for `arcsign(1)` (ships in `python3-dkim`): https://manpages.ubuntu.com/manpages/bionic/man1/arcsign.1.html
- OpenARC project: https://github.com/trusteddomainproject/OpenARC
- Local bash syntax check (`bash -n`) for the report-processing script

## Issues Found

1. **Non-existent PyPI package** — The post recommended `sudo pip3 install dmarc-report-analyzer`. There is no PyPI package by that name. Replaced with `parsedmarc`, the widely-used, real, actively-maintained Python DMARC report parser.

2. **Bash syntax error in report-processing script** — The two report loops used `for report in "$REPORT_DIR"/*.xml.gz 2>/dev/null; do`. Verified with `bash -n` that this is a parse error (`syntax error near unexpected token '2'`) — redirections are not permitted between the wordlist and the `;` terminator of a `for` clause. Removed the bogus redirection and added `shopt -s nullglob` so the loop body is skipped cleanly when there are no matching files (the existing `[ -f "$report" ] || continue` guard is now belt-and-suspenders but harmless).

3. **Incorrect ARC instructions** — The post said `sudo apt install -y libarc-perl` and then to add `ArcSign yes` to `/etc/opendkim.conf`. Neither is correct:
   - `libarc-perl` does not exist in Ubuntu repositories.
   - The Ubuntu OpenDKIM package (2.11.0~beta in jammy) does not document any `ArcSign` directive in its `opendkim.conf(5)` man page; ARC signing is not exposed by the packaged OpenDKIM.
   Rewrote this block to (a) point readers to OpenARC (the actual ARC reference milter from the Trusted Domain Project, which has to be built from source as it is not in Ubuntu repos), and (b) mention the `arcsign(1)` filter shipped with `python3-dkim` as a packaged alternative. The factual claim about ARC's purpose (and Gmail honoring valid ARC chains) was retained.

## Review Notes

- `sudo pip3 install parsedmarc` works on older Ubuntu releases but on Ubuntu 23.04+ pip refuses system-wide installs by default (PEP 668 "externally managed environment"). On newer releases users will need `pipx install parsedmarc` or a virtualenv. Left as-is because the post is generic and the failure mode is self-explanatory.
- The `pct=` tag is technically the percentage of the Domain Owner's mail stream to which the policy is applied (RFC 7489 §6.6.4); messages not selected are treated per the next-lower policy. The post's gloss "apply to 20% of failing mail" is an acceptable simplification.
- `HistoryFile /var/log/opendmarc.log` works but is an unusual choice — the OpenDMARC history file is a state file consumed by `opendmarc-import`, not a syslog-style log. Default in the Ubuntu package is `/var/run/opendmarc/opendmarc.dat`. Left as-is since the configuration is functional.
- The `fo=` tag is used in several record examples but is not in the "Key tags" bullet list. Not a technical error, just an editorial gap.
- `Mail::DMARC::PurePerl` is a real CPAN module; the `cpanm` install line is correct (assumes a working CPAN toolchain).
