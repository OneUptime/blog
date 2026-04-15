# Validation Summary: How to Debug Dapr Network Issues with tcpdump

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- tcpdump
- tshark / Wireshark
- Kubernetes (kubectl exec, kubectl debug, ephemeral containers)
- gRPC
- TCP/IP networking

## Sources Consulted
- tcpdump man page (`man tcpdump`) — verified output format, flag display syntax, and BPF filter syntax
- Dapr official documentation (docs.dapr.io) — verified default ports (HTTP 3500, gRPC 50001), API endpoint formats, health endpoint path, sidecar container name (`daprd`), and distroless base image usage
- Wireshark/tshark documentation — verified that TCP retransmission detection is a Wireshark/tshark feature requiring TCP stream analysis, not available in tcpdump
- Kubernetes documentation — verified `kubectl debug` ephemeral container syntax and `kubectl cp` container flag usage

## Issues Found

1. **Incorrect grep for "Connection refused" in tcpdump output (line 82):** tcpdump never outputs the text "Connection refused". TCP connection refusals manifest as RST packets (`Flags [R]` or `Flags [R.]`). Changed the command from `tcpdump -r dapr-capture.pcap | grep "Connection refused"` to `tcpdump -r dapr-capture.pcap 'dst port 3000' | grep "Flags \[R"` which correctly filters for RST packets directed at the app port.

2. **Incorrect grep for "Retransmission" in tcpdump output (line 93):** tcpdump does not perform TCP stream analysis and never labels packets as retransmissions. This is a Wireshark/tshark feature. Changed the command from `tcpdump -r dapr-capture.pcap | grep "Retransmission"` to `tshark -r dapr-capture.pcap -Y "tcp.analysis.retransmission"` which uses tshark's TCP analysis to correctly identify retransmitted packets.

3. **Running apt-get inside the daprd container (line 47-48):** The Dapr sidecar container (`daprd`) uses a distroless base image (`gcr.io/distroless/static`) which contains no shell, package manager, or standard Unix utilities. The `kubectl exec -c daprd -- sh -c "apt-get install ..."` command would fail. Changed the container target from `daprd` to `app` for both the install/capture and copy commands, since all containers in a pod share the same network namespace. Added clarifying comments.

## Review Notes
- The loopback interface is named `lo` on Linux but `lo0` on macOS. The post uses `lo` which is correct for the Linux/container context where Dapr is typically deployed, but readers debugging locally on macOS would need to adjust.
- The `netstat -tlnp` command used for verifying the app is listening may not be available in all containers; `ss -tlnp` is a more modern alternative. However, `netstat` is not technically wrong.
- The Wireshark gRPC dissector instructions (Decode As > gRPC) are a valid approach, though modern Wireshark versions can often auto-detect HTTP/2 and gRPC traffic without manual protocol selection.
- The `grep "Flags \[R\]"` command for RST packets (line 100) correctly matches pure RST flags. To also catch RST+ACK (`Flags [R.]`), the pattern `"Flags \[R"` (without the closing bracket) would be more inclusive. Left as-is since the post's pattern is technically correct for the described scenario.
