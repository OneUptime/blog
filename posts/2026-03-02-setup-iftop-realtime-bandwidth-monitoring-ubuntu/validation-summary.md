# Validation Summary: How to Set Up iftop for Real-Time Bandwidth Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iftop (1.0pre4 — current version in Ubuntu 24.04 universe repository)
- Ubuntu (apt package management)
- Berkeley Packet Filter (BPF) expressions
- Linux capabilities (setcap, cap_net_raw)
- libpcap (underlying packet capture library)
- Companion tools mentioned: nethogs, nload, vnstat, darkstat, ss, lsof

## Sources Consulted
- Official iftop man page (extracted from `iftop_1.0~pre4-9build2_amd64.deb`)
- `iftop -h` runtime help output (extracted from `/usr/sbin/iftop` binary, version 1.0pre4)
- Embedded help screen strings extracted from the iftop binary itself
- iftop upstream project page: http://www.ex-parrot.com/~pdw/iftop/
- tcpdump(8) BPF filter expression syntax (referenced via pcap-filter(7))

## Issues Found

1. **Incorrect keyboard shortcut for BPF filter editing.** The original post listed `l` as the key to "Set a filter expression" and the "Set Filters Interactively" section instructed readers to press `l` to enter BPF expressions like `host 10.0.0.50` on the fly. This is wrong. Verified directly from the iftop binary's embedded help screen and the man page DISPLAY FILTERING / FILTER CODE sections:
   - `f` — edits the BPF filter code (the same filter syntax used with `-f` on the command line).
   - `l` — sets a *screen filter*, which is a POSIX regex applied only to displayed hostnames; it does not affect packet capture.

   Fix applied: updated the keyboard shortcut table to include both `f` (edit BPF filter code) and `l` (set screen regex filter), and rewrote the "Set Filters Interactively" section to direct readers to press `f` for BPF filter editing, with a clarifying note about what `l` actually does.

## Review Notes
- All command-line flags verified against `iftop -h` output: `-i`, `-n`, `-P`, `-f`, `-t`, `-s` (only valid with `-t`) — all are correct.
- The binary path `/usr/sbin/iftop` is correct on Ubuntu 24.04 (confirmed from extracted package contents).
- The 2s / 10s / 40s averaging windows and the "default sort by 10s average" claim are accurate per the man page.
- The example display and footer output formats are representative of iftop's actual layout.
- All BPF filter examples (`host`, `port`, `net`, `dst port`, `src host`, `not net`) are valid pcap-filter syntax.
- `setcap cap_net_raw+eip /usr/sbin/iftop` is sufficient for unprivileged packet capture in most cases. Some configurations may also benefit from `cap_net_admin` (for example, if promiscuous mode toggling is needed via `-p`), but the basic capability shown is correct for the typical case described.
- The man page text contains a stale note about pressing `r` to toggle DNS resolution, but the embedded help in the actual binary (and the blog) correctly identify the key as `n`. No change needed — the blog is right and the man page note is outdated.
- The iftop comparison table is fair and accurate (nethogs is per-process, nload is interface totals, vnstat/darkstat are historical).
