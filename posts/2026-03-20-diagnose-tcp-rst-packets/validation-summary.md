# Validation Summary: How to Diagnose TCP RST (Reset) Packets in Your Network

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- TCP
- RFC 9293
- tcpdump
- libpcap capture filters
- Wireshark
- Linux sysctl
- Linux conntrack / nf_conntrack
- ss
- Python socket programming
- AWS Application Load Balancer
- nginx
- HAProxy

## Sources Consulted
- RFC 9293: Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293
- Linux kernel conntrack sysctl documentation: https://www.kernel.org/doc/html/v5.10/networking/nf_conntrack-sysctl.html
- Linux `pcap-filter(7)` reference: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux `socket(7)` reference: https://www.man7.org/linux/man-pages/man7/socket.7.html
- Linux `tcp(7)` reference: https://www.man7.org/linux/man-pages/man7/tcp.7.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- AWS Application Load Balancer attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/2-1r1/
- Local command help checked for `tcpdump`, `ss`, and `sysctl`
- Local command parsing checked with `tcpdump -d`
- Local Python syntax checked with `python3`

## Issues Found
- The "specific destination" `tcpdump` example used `host 10.20.0.5`, which matches either source or destination. I changed it to `dst host 10.20.0.5` so the command matches the description.
- The post used legacy conntrack sysctl names under `net.ipv4.netfilter.ip_conntrack_*`. I updated them to the current documented `net.netfilter.nf_conntrack_*` keys.
- The firewall timeout explanation stated middlebox behavior too absolutely. I changed it to say a later packet may be rejected, often as a RST, because timeout handling varies by device.
- The load balancer section claimed an idle timeout sends a backend RST and that HAProxy defaults to 50 seconds. I corrected this to vendor-documented behavior: ALB defaults to a 60-second idle timeout, nginx `proxy_read_timeout` defaults to 60 seconds, and HAProxy has no single 50-second default timeout.
- The keepalive fix implied that sysctl changes alone enable TCP keepalives. I clarified that keepalives must be enabled on the sockets that need them; the sysctls tune the timing.
- The Python example was missing `import struct`. I added it and corrected the code fence to `python`.
- The Wireshark guidance said `seq=0` likely means a firewall or IDS. I corrected this because RFC 9293 allows valid RSTs with sequence number 0, including replies to SYNs sent to closed ports.
- The source-IP guidance and conclusion were slightly too absolute. I changed them to "usually" / "often" to better match real packet paths and middlebox behavior.

## Review Notes
- The post is now technically sound, but it is Linux-centric. The `sysctl`, `ss`, conntrack, and `SO_LINGER` examples are not platform-neutral.
- The keepalive values shown are example tuning values, not universal defaults or best settings for every environment.
