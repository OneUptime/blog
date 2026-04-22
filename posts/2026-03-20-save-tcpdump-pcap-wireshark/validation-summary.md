# Validation Summary: How to Save tcpdump Captures to a PCAP File for Wireshark Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap PCAP save files and capture filters
- Wireshark and Wireshark display filters
- mergecap
- gzip/zcat
- GNU coreutils timeout and du
- Bash scripting

## Sources Consulted
- tcpdump 4.99.5 official man page: https://www.tcpdump.org/manpages/tcpdump.1-4.99.5.html
- libpcap pcap-savefile official man page: https://www.tcpdump.org/manpages/pcap-savefile.5.html
- libpcap pcap-filter man page: https://manpages.debian.org/trixie/libpcap0.8t64/pcap-filter.7.en.html
- Wireshark command-line manual page: https://www.wireshark.org/docs/man-pages/wireshark
- Wireshark mergecap manual page: https://www.wireshark.org/docs/man-pages/mergecap.html
- Wireshark display filter documentation: https://www.wireshark.org/docs/man-pages/wireshark-filter.html
- Wireshark display filter reference: https://www.wireshark.org/docs/dfref/
- GNU gzip manual: https://www.gnu.org/software/gzip/manual/gzip.html
- GNU coreutils timeout manual: https://www.gnu.org/s/coreutils/timeout
- GNU coreutils du manual: https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html
- Local verification with tcpdump 4.99.4, libpcap 1.10.4, `tcpdump -d` filter compilation, `gzip --help`, `timeout --help`, and Ubuntu `wireshark-common` package contents.

## Issues Found
- The `-n` example said it made saved output smaller. `-n` disables address and port name resolution in printed output; it does not reduce raw PCAP file size. Updated the comment to state that PCAP size is unchanged.
- The time rotation example claimed `-G 300 -W 12` keeps 12 files as a rolling one-hour buffer. tcpdump exits after creating the `-W` count when `-W` is used with `-G` alone. Updated the comment to say it writes 12 five-minute files and then stops.
- The tcpdump offline filtering examples were labeled as display filters. tcpdump uses libpcap capture/BPF filter syntax, while Wireshark display filters use different syntax. Updated the label.
- The Wireshark compressed-file comment implied unconditional `.pcap.gz` support. Wireshark can read gzip-compressed capture files when built with gzip/zlib support, so the comment now includes that condition.
- The Wireshark workflow list was fenced as `bash` even though it was not shell syntax. Changed the fence to `text`.
- The long-running Bash script used `sudo tcpdump` inside a script that also writes under `/var`, which makes `$!` track the `sudo` process rather than tcpdump in common cases and still requires root for other operations. Updated the script to be run as root and start `tcpdump` directly.
- The script used `du -sg`, which is not valid with GNU coreutils `du`. Replaced it with `du -sk` and a KB threshold derived from `MAX_SIZE_GB`.
- The script's size cleanup path could run `rm` without a selected file or mishandle the capture directory quoting. Added an `oldest_file` check and quoted the deletion.
- `mergecap` defaults to pcapng output even when the output filename ends in `.pcap`. Added `-F pcap` to the merge examples so they produce PCAP files as described.

## Review Notes
- The tcpdump capture filters in the examples compiled successfully with local `tcpdump -d`.
- Live packet capture commands were not executed because they depend on host interfaces and capture privileges.
- `eth0` is a conventional example interface name; users may need to substitute the interface shown by `tcpdump -D` on their system.
- The post's `-C 10` examples use decimal MB semantics, matching tcpdump's default "millions of bytes" unit for `-C`.
