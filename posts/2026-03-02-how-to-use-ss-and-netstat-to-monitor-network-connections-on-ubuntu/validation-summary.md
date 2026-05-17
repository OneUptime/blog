# Validation Summary: How to Use ss and netstat to Monitor Network Connections on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `ss` (from iproute2)
- `netstat` (from net-tools)
- Linux TCP socket states
- `fuser` command
- `watch` and basic shell pipelines (awk, grep, sort, uniq)
- `/proc/net/` interface
- Netlink (used by ss to talk to the kernel)

## Sources Consulted
- `man ss` (iproute2-6.1.0) — verified flags, default behavior, filter expression syntax (predicates, operators, HOST SYNTAX), STATE-FILTER identifiers.
- `ss --help` and `ss --version` — verified the documented flags such as `-t`, `-l`, `-n`, `-p`, `-a`, `-u`, `-x`, `-s`, `-m`, `-e` and that `--version` is supported.
- `netstat --help` (net-tools 2.10) — verified `-t`, `-u`, `-l`, `-n`, `-a`, `-p`, `-r`, `-i`, `-s` flag combinations.
- iproute2 documentation on the ss filter EXPRESSION grammar (predicates `dst`/`src`/`dport`/`sport`, operators `=`, `or`, parentheses).
- Linux kernel TCP state machine documentation for the meanings of LISTEN, ESTABLISHED, SYN-SENT, SYN-RECV, FIN-WAIT-2, CLOSE-WAIT, TIME-WAIT.

## Issues Found
1. **Misleading comment about default `ss` behavior** — The original snippet said `# Show all connections` above a bare `ss` invocation. Per `man ss`, when no option is used `ss` displays only non-listening sockets (established connections), not "all connections". Updated the comment to: `# Show non-listening (established) sockets by default`. Also updated the adjacent `ss -a` comment from "Show all listening and established connections" to "Show all listening and non-listening sockets" to match the man page wording precisely.
2. **Incorrect tense / mechanism description for netstat** — The original said netstat "parsed `/proc/net/tcp` files" (past tense, and missing the netlink contrast for ss). Netstat still reads files under `/proc/net/` today, and `ss` uses netlink (specifically the `NETLINK_SOCK_DIAG` interface) rather than `/proc`. Updated to: "`ss` (socket statistics) reads directly from the kernel's socket structures via netlink, making it faster and more accurate than `netstat`, which parses files under `/proc/net/`."

All other commands, filter expressions, flags, and state explanations were verified to be correct, including:
- `ss -tlnp`, `ss -ulnp`, `ss -lnp`, `ss -tnp state established`, `ss -tn state time-wait`, `ss -tn state syn-recv`, `ss -s`, `ss -tm`, `ss -te`.
- Filter syntax such as `'( dport = :80 or sport = :80 )'`, `'dport = :443'`, `'dst :22'`, `'src 192.168.1.100'` — all match the documented EXPRESSION grammar where `HOST` is `[FAMILY:]ADDRESS[:PORT]`.
- `sudo fuser 8080/tcp` is the correct syntax for identifying processes using a TCP port.
- `netstat -tunap`, `netstat -tlnp`, `netstat -ulnp`, `netstat -tan`, `netstat -rn`, `netstat -i`, `netstat -s` all match net-tools' documented usage.
- TCP state descriptions are accurate at the level expected of a practical guide.
- The sample `ss -s` output is internally consistent (IP + IPv6 columns sum to Total for each transport row; RAW + UDP + TCP sums to INET).

## Review Notes
- `ss -t`, `ss -u`, etc., similarly only show non-listening sockets by default (combine with `-a` to also include listening sockets). The post's casual phrasing ("Show all TCP connections" for `ss -t`) is a common shorthand but technically describes "non-listening TCP sockets". Left as-is since this matches widespread tutorial convention and the corrected note on default `ss` behavior already clarifies this for readers.
- The FIN-WAIT-2 description ("local end sent FIN, waiting for remote") is a simplification; strictly speaking, FIN-WAIT-2 is entered after the local FIN has been ACKed and is waiting for the remote's FIN. The post's wording is acceptable for an introductory reference.
- `netstat` continues to ship in Ubuntu via the `net-tools` package, but `net-tools` has been in maintenance-only mode upstream for over a decade; the post's framing of `ss` as the preferred modern tool is accurate and aligns with the Debian/Ubuntu deprecation guidance.
- No version-specific information in the post is at risk of becoming outdated in the near term; both `ss` and `netstat` flag semantics covered here have been stable across many releases.
