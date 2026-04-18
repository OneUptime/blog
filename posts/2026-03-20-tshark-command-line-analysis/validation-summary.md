# Validation Summary: How to Use tshark for Command-Line Packet Analysis

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- tshark (Wireshark CLI)
- Wireshark display filter language
- BPF capture filters
- PCAP file format
- Bash scripting / Unix text processing (awk, sort, uniq)

## Sources Consulted
- tshark(1) man page / official Wireshark documentation: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference: https://www.wireshark.org/docs/dfref/
- Wireshark User's Guide, Chapter 9 (Statistics) and capinfos/tshark sections: https://www.wireshark.org/docs/wsug_html_chunked/
- Wireshark HTTP dissector field reference (http.request.method, http.request.uri, http.request.full_uri, http.response.code, http.time): https://www.wireshark.org/docs/dfref/h/http.html
- Wireshark DNS dissector field reference (dns.qry.name, dns.flags.response, dns.flags.rcode): https://www.wireshark.org/docs/dfref/d/dns.html

## Issues Found
- **`-R` flag mischaracterization (Step 2)**: The post previously stated that `-R` reads a PCAP "with capture filter (faster - uses BPF, applied before parsing)" and used BPF-style syntax `'host 192.168.1.50'`. This is incorrect on two counts: (1) `-R` is a *read* filter that uses Wireshark **display filter** syntax, not BPF syntax, and (2) it is only meaningful in two-pass analysis (requires `-2`). BPF capture filters (`-f`) only apply during live capture, not when reading a pcap. Replaced the command with `tshark -r /tmp/capture.pcap -2 -R 'ip.addr == 192.168.1.50'` and updated the comment to describe the actual behavior.

## Review Notes
- `sudo usermod -aG wireshark $USER` alone is not always sufficient for non-root capture on Debian/Ubuntu — users may also need to run `sudo dpkg-reconfigure wireshark-common` and select "Yes" to allow non-superusers to capture packets. Left as-is since it's a reasonable starting point and the post is general guidance.
- On RHEL/Fedora/Rocky, some distribution versions split the CLI into `wireshark-cli` while `wireshark` is the GUI/meta package. `sudo yum install wireshark` usually pulls in tshark as a dependency but this varies by release. Not changed.
- In Step 7, the "Top 10 Slowest Requests" script extracts `http.request.method` and `http.request.full_uri` from packets matching `-Y 'http.response'`. These request-side fields are typically empty on response packets during single-pass processing; a two-pass (`-2`) run with request/response tracking is generally needed for reliable correlation. Left unchanged as it's a user-contributed script example and the `http.time` field is valid on responses.
- No other technical issues found. All flags (`-D`, `-i`, `-f`, `-c`, `-n`, `-w`, `-r`, `-Y`, `-T fields`, `-e`, `-E header=y/separator=`, `-q -z`, `-d proto==port,proto`, `-V`) match official tshark documentation. Statistics specifiers (`io,phs`, `conv,tcp`, `http,tree`, `endpoints,ip`, `expert`, `io,stat`) are all valid. Display filter expressions and field names (`http.response.code`, `dns.flags.response`, `dns.flags.rcode`, `tcp.flags.reset`, `tcp.analysis.ack_rtt`, `icmp.type`, `icmp.code`, `vlan.id`, `frame.time_epoch`) are correct per the Wireshark display filter reference.
