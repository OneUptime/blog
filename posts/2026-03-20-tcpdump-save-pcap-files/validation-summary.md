# Validation Summary: How to Save tcpdump Captures to PCAP Files for Later Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap / PCAP capture files
- pcap-filter capture and read filters
- Wireshark and mergecap
- GNU gzip / gunzip
- GNU coreutils timeout
- OpenSSH ssh / scp
- Linux command line networking workflows

## Sources Consulted
- tcpdump(1) official man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter(7) official man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Wireshark mergecap(1) official man page: https://www.wireshark.org/docs/man-pages/mergecap
- Wireshark(1) official man page: https://www.wireshark.org/docs/man-pages/wireshark.html
- GNU Coreutils timeout manual: https://www.gnu.org/s/coreutils/timeout
- GNU Gzip manual: https://www.gnu.org/s/gzip/manual/gzip.html
- OpenBSD/OpenSSH scp(1) manual: https://man.openbsd.org/scp.1
- OpenBSD/OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- Local tcpdump 4.99.4 `--help` and `man tcpdump` output

## Issues Found
- The snap length example said the default snap length is "full". Current tcpdump documentation states the default snapshot length is 262144 bytes, and `-s 0` maps to that default. Updated the comment to describe the actual 262144-byte default.
- The time-based rotation example said `-G 60 -W 10` would "keep 10 files". tcpdump documents `-W` with `-G` as stopping after the configured number of rotated files, not a rolling keep count. Updated the comment to "stop after 10 files".
- The combined size/time rotation example used `-C`, `-G`, and `-W` together. tcpdump documents `-W` as ignored for limiting purposes when used with both `-C` and `-G`, so the example could imply a retention limit that does not exist. Removed `-W 20` and used a timestamped `-w` pattern.
- The merge example wrote to a `.pcap` filename even though current mergecap writes pcapng by default. Updated the output filename to `.pcapng`.
- The "Filter and merge" example did not actually apply a filter. Updated the pipeline to merge first and then use tcpdump with a `tcp and port 80` filter when writing the filtered output.

## Review Notes
- The commands assume a Linux system with an interface named `eth0`; on many current distributions the interface name may differ.
- `sudo apt install wireshark-common -y` is appropriate for Debian/Ubuntu-style systems, but other Linux distributions use different package names or package managers.
