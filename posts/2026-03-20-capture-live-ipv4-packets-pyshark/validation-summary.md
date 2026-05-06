# Validation Summary: How to Capture Live IPv4 Packets Using PyShark

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- PyShark
- TShark
- Wireshark
- IPv4
- BPF capture filters

## Sources Consulted
- PyShark GitHub README: https://github.com/KimiNewt/pyshark
- PyShark usage docs, LiveCapture usage: https://pyshark-packet-analysis.readthedocs.io/en/latest/capture_usage/live_capture_usage/
- PyShark usage docs, LiveCapture parameters: https://pyshark-packet-analysis.readthedocs.io/en/latest/parameters/live_capture_parameters/
- PyShark source, `Capture` base class: https://raw.githubusercontent.com/KimiNewt/pyshark/master/src/pyshark/capture/capture.py
- PyShark source, `LiveCapture`: https://raw.githubusercontent.com/KimiNewt/pyshark/master/src/pyshark/capture/live_capture.py
- Wireshark `tshark` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark display filter reference for IPv4: https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark display filter reference for TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark capture-filter documentation: https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html
- `pcap-filter(7)` manual page: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Homebrew formula for Wireshark CLI tools: https://formulae.brew.sh/formula/wireshark
- Scapy documentation: https://scapy.readthedocs.io/
- dpkt documentation: https://dpkt.readthedocs.io/en/stable/

## Issues Found
- The basic capture example claimed to use the "default interface" while explicitly passing `interface="eth0"`. I corrected the comment and replaced hard-coded interface names with `your_capture_interface` so the examples match PyShark's documented interface handling and remain portable.
- The TCP filtering example used `display_filter="tcp.port == 80 or tcp.port == 443"` and then accessed `packet.ip` unconditionally. That filter can also match IPv6 TCP packets, so I changed it to `ip and (tcp.port == 80 or tcp.port == 443)` to keep the example IPv4-safe.
- The asynchronous example used `async for packet in cap.sniff_continuously()`, but `sniff_continuously()` returns a synchronous generator. I replaced it with `async with pyshark.LiveCapture(...)` and `await cap.packets_from_tshark(...)`, which matches PyShark's async coroutine API.
- The file-capture example combined `display_filter` with `output_file`. TShark documents that display filters are not supported while capturing and saving packets with `-w`, so I changed the example to use `bpf_filter="ip"` instead.
- The file-capture section described the output as PCAP while using only `output_file`, which defaults to Wireshark's pcapng output format. I changed the example and section heading to `pcapng`.
- The introduction and comparison wording included stronger comparative claims than the official docs support directly. I tightened that wording to keep the post technically defensible without changing its intent.

## Review Notes
- Live capture commonly requires elevated privileges or OS-specific capture permissions even when PyShark and TShark are installed correctly.
- For live capture on busy interfaces, BPF/capture filters are more efficient than display filters, which Wireshark documents as more likely to drop packets under load.
- All five Python code blocks in the edited post were syntax-checked successfully with `ast.parse`.
