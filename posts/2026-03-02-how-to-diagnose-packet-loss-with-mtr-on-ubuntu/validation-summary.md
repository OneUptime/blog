# Validation Summary: How to Diagnose Packet Loss with mtr on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- mtr / mtr-tiny
- ICMP, TCP, and UDP network probing
- Linux networking commands: ping, ip route, ip link

## Sources Consulted
- Local `mtr --help` output for mtr 0.95
- Local `mtr(8)` man page for mtr 0.95
- Ubuntu package metadata for `mtr` and `mtr-tiny`
- Cloudflare Learning Center: What is My Traceroute (MTR)? https://www.cloudflare.com/learning/network-layer/what-is-mtr/
- Cloudflare Support docs: Gathering information for troubleshooting sites https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/gathering-information-for-troubleshooting-sites/

## Issues Found
- The report-mode comment said `mtr --report google.com` runs 100 cycles. `mtr --report` uses the default report cycle count unless `-c` is supplied, so the comment was corrected.
- The `Loss%` definition described packets as dropped at the hop. In MTR this is more precisely probes that did not receive a response from that hop, which may be caused by ICMP rate limiting or control-plane policing rather than transit packet loss. The column definition was updated.
- The real packet-loss example stated that the problem is definitively the link between hop 3 and hop 4. The evidence identifies the problem beginning at or around hop 4, commonly including that link, so the wording was made less over-specific.
- The TCP mode explanation said it tests the actual protocol. `mtr --tcp` sends TCP SYN probes and does not validate the application protocol itself, so the description was corrected.

## Review Notes
The remaining commands and options checked (`--report`, `-c`, `-n`, `--tcp`, `--udp`, `--port`, `-4`, `-6`, `--csv`, `--json`, and `--address`) match current `mtr` 0.95 help/man-page behavior on Ubuntu. Cloudflare's MTR guidance supports the post's interpretation that intermediate-hop loss without final-hop loss commonly reflects ICMP/control-plane rate limiting rather than path loss.
