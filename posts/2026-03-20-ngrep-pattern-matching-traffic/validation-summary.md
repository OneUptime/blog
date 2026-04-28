# Validation Summary: How to Use ngrep for Pattern Matching Network Traffic

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ngrep (network grep)
- BPF (Berkeley Packet Filter) expressions
- POSIX extended regular expressions
- HTTP/1.x protocol analysis
- pcap capture file format
- Linux capabilities (CAP_NET_RAW)

## Sources Consulted
- ngrep official man page / project repository (https://github.com/jpr5/ngrep)
- ngrep `-h` help output reference
- pcap-filter(7) BPF filter expression syntax
- HTTP/1.1 RFC 9112 (status line and header format)

## Issues Found
The following technical issues were identified and corrected in the "Useful Flags" table:

1. **`-A num` flag description was incorrect.** The post said "Print `num` bytes after match" — but per the ngrep man page, `-A num` dumps `num` *packets* of trailing context after a matching packet, not bytes. Updated to "Dump `num` packets of trailing context after a match".

2. **`-n count` flag description was imprecise.** The post said "Capture only `count` packets". Per the man page, `-n` makes ngrep examine only `count` packets total and then exit (it limits how many packets are inspected, not how many are captured). Updated to "Examine only `count` packets, then exit".

3. **`-q` flag description was misleading.** The post said "Quiet mode (suppress packet count)". The man page describes `-q` as: "be quiet; don't print packet reception hash marks ('#'s when not in -X mode)". Updated to "Quiet mode (suppress hash marks for non-matching packets)" to match the actual behavior.

## Review Notes
- All command examples (regex patterns, BPF filters, flag combinations) were verified and are syntactically correct.
- The regex `HTTP/1\.[01] [45][0-9][0-9]` correctly matches HTTP/1.0 and HTTP/1.1 4xx/5xx status lines.
- The regex `Content-Length: [0-9]{6,}` correctly matches Content-Length values of 6 or more digits (i.e., 100,000 bytes ≈ 100KB and up).
- The output format example (`T 10.0.0.1:54321 -> 10.0.0.2:80 [AP]`) accurately reflects ngrep's default packet rendering, with `T` denoting TCP and `[AP]` representing the ACK+PUSH flags.
- The claim that ngrep uses POSIX extended regular expressions is consistent with the man page (ngrep uses GNU regex with extended syntax).
- Installation commands (apt-get/yum/dnf/brew) are correct for the listed distributions; ngrep is in the Ubuntu universe repository.
- The note about HTTPS limitations (only the TLS handshake is visible without SSL termination) is accurate.
- The CAP_NET_RAW capability note is correct; non-promiscuous capture works with CAP_NET_RAW alone, though promiscuous mode may also require CAP_NET_ADMIN — this nuance is omitted but not incorrect.
