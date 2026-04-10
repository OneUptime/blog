# Validation Summary: How to Use Ceph Mailing Lists and IRC for Help

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook-Ceph (Kubernetes operator)
- IRC (OFTC network)
- irssi (IRC client)
- weechat (IRC client)
- Ceph CLI tools (`ceph version`, `ceph status`, `ceph health detail`)
- Mailman 3 / Postorius (mailing list management)

## Sources Consulted
- Ceph mailing list directory: https://lists.ceph.io/postorius/lists/
- irssi documentation for `-c` (connect) and `-n` (nick) flags
- weechat user guide and CLI documentation — weechat does not accept a server hostname as a positional argument; connections are made via `/connect` inside the client or with the `-r` run-command flag
- OFTC IRC network (irc.oftc.net) — confirmed as the current home of `#ceph` after the Freenode migration
- Ceph documentation for CLI commands: `ceph version`, `ceph status`, `ceph health detail`

## Issues Found
1. **Incorrect weechat command**: The post showed `weechat irc.oftc.net` as if weechat accepts a server hostname as a positional CLI argument. Weechat does not support this — its CLI syntax is `weechat [-a] [-d <path>] [-t] [-p] [-r <command>]`. Fixed by changing to `weechat` with a subsequent `/connect irc.oftc.net` comment, matching the pattern already used for the irssi example (start client, then issue commands inside it).

## Review Notes
- The email template code blocks are tagged as `yaml` but contain plain text email templates. This is a stylistic choice rather than a technical error — the yaml highlighting happens to render them readably — so it was left as-is.
- The URL `https://paste.ceph.com` could not be independently verified as an active paste service. The Ceph community has used various paste services over time. The post hedges with "or similar" which is appropriate.
- The mailing list addresses (ceph-users@ceph.io, ceph-devel@ceph.io, ceph-announce@ceph.io) and the Postorius subscribe URL are correct for the current Ceph infrastructure.
