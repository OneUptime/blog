# Validation Summary: How to Monitor IPv6 QoS Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking (RFC 8200)
- Linux Traffic Control (`tc`) and qdiscs (HTB)
- DSCP / QoS class statistics
- `tcpdump` for packet inspection
- `ping6` (iputils) for latency/jitter measurement
- Python 3 (`subprocess`, `re`) for parsing tc output
- Bash scripting with `BASH_REMATCH`
- Prometheus exposition format and `node_exporter`
- Grafana / PromQL queries

## Sources Consulted
- iputils `ping6` man page and live output format verification (`rtt min/avg/max/mdev = .../... ms`)
- `tc(8)` man page and `tc-htb(8)` for class/qdisc statistics output formats
- Prometheus node_exporter documentation and source: https://github.com/prometheus/node_exporter (collectors list, including `qdisc`, `netdev`, `softnet`, `udp_queues`)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- Bash Reference Manual (parameter expansion, `${var//pattern/string}`)
- Prometheus exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
1. **Incorrect node_exporter collector name.** The post referenced `node_exporter --collector.network_queue_statistics`, which does not exist. Replaced with `--collector.qdisc`, which is the actual collector that exposes Linux queuing-discipline (tc) statistics in node_exporter.
2. **Bash substitution produced wrong class label.** `${BASH_REMATCH[1]//:/underscore}` substitutes the literal word "underscore" for `:`, producing class names like `1underscore10`. The Grafana/PromQL queries later in the post expect labels of the form `1_10`. Changed to `${BASH_REMATCH[1]//:/_}` so the bash collector output matches the documented PromQL queries.
3. **Invalid IPv6 ping targets.** `2001:db8::voip-server`, `2001:db8::video-server`, and `2001:db8::web-server` are not valid IPv6 addresses (hyphens and non-hex characters are not permitted in IPv6 literals), and `ping6` rejects them with "Name or service not known". Replaced with valid documentation-prefix addresses (`2001:db8::1`, `2001:db8::2`, `2001:db8::3`) per RFC 3849.
4. **Broken `min` extraction in ping parser.** `awk -F/ '{print $4}'` on `rtt min/avg/max/mdev = 0.020/0.020/0.020/0.000 ms` returns `mdev = 0.020` (the literal text including the prefix), not just the min value. Added a second `awk '{print $NF}'` stage to extract the trailing numeric value, matching the avg/max/mdev parsing style used in the rest of the script.

## Review Notes
- `ping6` is deprecated on modern iputils (in favor of `ping -6`) but remains available on most distributions, so it is acceptable as written.
- The custom `tc_stats_collector.sh` writes Prometheus exposition output to stdout; integration into a real scrape target (e.g., textfile collector or pushgateway) is left to the reader, which is consistent with the post's scope.
- The Python parser uses a permissive regex (`class \w+ (\d+:\d+)`); for HTB it works, but other qdiscs (e.g., `cake`, `fq_codel`) produce different class formats. Not in scope for this post.
- The Grafana section uses a `text` code block and intentionally documents queries rather than a JSON dashboard; this is fine.
