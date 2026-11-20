# Validation review

Reviewed the outer/inner address distinction, VNI-valid flag, UDP port roles, snapshot and filter scope against RFC7348 and official Linux/tcpdump/libpcap sources.

The local synthetic packet test decoded VNI100 and VNI200 frames and asserted their outer addresses, inner MAC/IP addresses, UDP ports and ICMP identifiers. Endpoint and arithmetic VNI filters produced the expected positive/negative matches. The plain inner-host filter matched neither encapsulated frame. Published output excerpts agree with that decoder output. Four shell snippets passed syntax checks. The Mermaid structure and generated social image were reviewed; the title is readable and unclipped.

No live packet capture or forwarding test was performed. Synthetic packets do not demonstrate actual decapsulation, application delivery or hardware-offload behavior. Tests cover untagged unfragmented IPv4 only. The local decoder is tcpdump4.99.1, while references use upstream4.99.5. The diagram was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
