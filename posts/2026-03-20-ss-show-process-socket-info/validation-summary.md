# Validation Summary: How to Show Process Information for Sockets with ss -p

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- Linux `ss` command from iproute2
- TCP and UDP sockets
- Process/PID/file descriptor socket reporting
- Bash, `awk`, `grep`, `ps`, and `kill`

## Sources Consulted
- Local `ss --help` and `ss(8)` man page for iproute2 6.1.0.
- Debian iproute2 `ss(8)` manual page: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- GNU Awk User's Guide, String Functions: https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- GitHub profile URL checked: https://github.com/nawazdhandala

## Issues Found
- The first example said `sudo ss -p` showed all sockets, but `ss(8)` documents that `-a` / `--all` is required to include both listening and non-listening sockets. Changed it to `sudo ss -ap`.
- The TCP example used `sudo ss -tp` under a broad "TCP sockets" label, but without `-a` this shows established, non-listening TCP sockets by default. Updated the comment to say "Established TCP sockets with process info."
- The non-root example showed an established socket with local address `0.0.0.0:22`. `0.0.0.0` is a wildcard bind/listen address, not a concrete established endpoint, so the example now uses the RFC 5737 documentation address `192.0.2.10:22`.
- The process-to-port `awk` snippet used `match(..., arr)`, where the capture-array argument is a GNU awk extension and fails with the default `mawk` in this environment. Rewrote the snippet to use portable `awk` string extraction and `ss -H` to suppress the header.

## Review Notes
The remaining `ss` filters, state syntax, and destination-port examples match the documented `ss` filter grammar. The `grep -P` example is valid on typical GNU/Linux systems with GNU grep, but it is less portable to non-GNU grep implementations.
