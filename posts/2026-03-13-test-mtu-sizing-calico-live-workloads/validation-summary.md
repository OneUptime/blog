# Validation Summary: How to Test MTU Sizing for Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Testing Guide

## Technologies Covered
- Calico (CNI plugin, MTU configuration)
- Kubernetes (kubectl run, kubectl exec, Pod scheduling via `--overrides`)
- iperf3 (networkstatic/iperf3 Docker image, throughput benchmarking)
- curl (write-out variables, TLS testing)
- nginx (test server image)
- PostgreSQL (psql client)
- Linux networking tools (netstat, ip, watch, dd)
- Mermaid (diagram syntax)

## Sources Consulted
- [kubectl run reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/) — verified `--image`, `--port`, `--overrides` flags
- [curl manpage](https://curl.se/docs/manpage.html) — verified `-k`, `--tlsv1.3`, `-w`, `-o` flags and `speed_download`, `time_connect`, `time_appconnect` write-out variables
- [iperf3 manpage](https://software.es.net/iperf/invoking.html) — verified `-c`, `-s`, `-t`, `-P` flags
- [Calico MTU documentation](https://docs.tigera.io/calico/latest/networking/configuring/mtu) — verified MTU testing approach
- [netstat manpage](https://man7.org/linux/man-pages/man8/netstat.8.html) — verified `-s` for protocol statistics
- [ip-link manpage](https://man7.org/linux/man-pages/man8/ip-link.8.html) — verified `-s` for statistics output
- [Mermaid flowchart docs](https://mermaid.js.org/syntax/flowchart.html) — verified node label syntax
- [networkstatic/iperf3 Docker image](https://hub.docker.com/r/networkstatic/iperf3) — confirmed image exists

## Issues Found
No technical issues found.

## Review Notes
- All kubectl, curl, iperf3, dd, watch, netstat, and ip commands are syntactically correct.
- The `--overrides='{"spec":{"nodeName":"different-node"}}'` JSON merges into the Pod spec correctly to force scheduling onto a specific node — readers will need to substitute an actual node name from `kubectl get nodes`.
- curl write-out variables `%{speed_download}`, `%{time_connect}`, and `%{time_appconnect}` are all valid and produce useful timing/throughput data for MTU testing.
- The `--tlsv1.3` curl flag is supported in curl 7.52.0+ and forces TLS 1.3 minimum.
- The TLS test example uses the default nginx image with `--port=443`, but the stock nginx image does not serve HTTPS without TLS configuration; readers should treat the snippet as a conceptual placeholder and substitute an actual TLS-enabled service for end-to-end testing.
- The Mermaid diagram uses `\n` in node labels for line breaks — this is consistent with other posts in this blog and renders correctly in the renderer used here.
- The fragmentation monitoring approach via `netstat -s | grep -E 'fragment|reassembl'` correctly captures IP fragmentation and reassembly counters, which is the right signal for MTU misconfiguration detection.
- The `dd if=/dev/urandom of=... bs=1M count=100` command correctly creates a 100MB random-data file suitable for exercising large transfers across the MTU.
