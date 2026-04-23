# Validation Summary: How to Read PCAP Files and Extract IPv4 Data with dpkt

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- dpkt
- PCAP
- PCAPNG
- IPv4
- TCP
- HTTP

## Sources Consulted
- dpkt on PyPI: https://pypi.org/project/dpkt/
- dpkt Print Packets example: https://kbandla.github.io/dpkt/print_packets.html
- dpkt Print HTTP Requests example: https://kbandla.github.io/dpkt/print_http_requests.html
- dpkt `pcap.Reader` source/docs: https://dpkt.readthedocs.io/en/latest/_modules/dpkt/pcap.html
- dpkt `http.Request` source/docs: https://dpkt.readthedocs.io/en/latest/_modules/dpkt/http.html
- dpkt changelog: https://kbandla.github.io/dpkt/changelog.html
- dpkt GitHub releases: https://github.com/kbandla/dpkt/releases
- Author link check: https://github.com/nawazdhandala

## Issues Found
- The intro sentence said dpkt provides two readers. Current dpkt releases also include `dpkt.pcap.UniversalReader`, so I changed the wording to accurately describe `pcap.Reader` and `pcapng.Reader` without making an outdated exhaustive claim.
- The HTTP extraction example used manual payload prefix matching and included `DELT`, which is not a valid HTTP method token. I replaced that logic with `dpkt.http.Request(tcp.data)`, filtered to `GET` and `POST` to match the snippet's stated behavior, and added `dpkt.dpkt.NeedData` handling for incomplete request data.
- The original HTTP snippet implied broader extraction than it can reliably support without TCP stream reassembly. I updated the function docstring so it correctly states that it only extracts requests that fit within a single TCP packet.

## Review Notes
- `dpkt`'s latest PyPI release is `1.9.8` as of April 23, 2026.
- The examples assume Ethernet-framed captures. PCAP files with other datalink types need different frame parsing logic before accessing IPv4 headers.
- The HTTP example still does not perform TCP stream reassembly, which is consistent with upstream dpkt examples; multi-packet HTTP requests will be skipped rather than reconstructed.
