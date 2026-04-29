# Validation Summary: How to Measure UDP Jitter and Latency on Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- UDP
- ICMP `ping`
- `iperf3`
- Python 3
- Bash
- Network latency, jitter, and packet-loss measurement

## Sources Consulted
- iperf3 official documentation: https://software.es.net/iperf/invoking.html
- iperf3 official GitHub repository: https://github.com/esnet/iperf
- ESnet maintainer guidance on choosing `-l` and `-b` for packet cadence: https://github.com/esnet/iperf/discussions/1581
- ESnet issue showing UDP jitter computation is based on RFC 1889 / RTP-style interarrival jitter: https://github.com/esnet/iperf/issues/755
- ESnet issue showing UDP JSON output differences across versions (`sum`, `sum_received`, `sum_sent`): https://github.com/esnet/iperf/issues/1784
- ESnet issue showing older UDP JSON output using `end.sum`: https://github.com/esnet/iperf/issues/584
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Python `statistics` documentation: https://docs.python.org/3.11/library/statistics.html
- RFC 2679, A One-way Delay Metric for IPPM: https://www.rfc-editor.org/rfc/rfc2679.html
- RFC 3550, RTP: A Transport Protocol for Real-Time Applications: https://www.rfc-editor.org/rfc/rfc3550.html

## Issues Found
- The post description and the Python section claimed one-way latency measurement, but the script only measured UDP echo RTT. I corrected the description, retitled the section, updated the script header, and added a note that one-way latency requires synchronized clocks on both hosts.
- The `ping` section described Linux `mdev` as "mean deviation" and treated it as jitter. I corrected this to `mdev` being the population standard deviation of RTT, which is only a rough proxy for latency variability and not a UDP-specific jitter metric.
- The iperf3 VoIP example used `-b 1M -l 160` and said it simulated a single G.711 call leg. That bitrate does not match 160-byte payloads at a 20 ms cadence. I changed it to `-b 64K -l 160` and clarified that this approximates 160-byte payloads at about 50 packets/sec.
- The Python snippet used `statistics.stdev()` without guarding for a single successful RTT sample, which can raise `StatisticsError`. I added a length check and changed the output label to `RTT Std Dev` for accuracy.
- The Python snippet's P99 calculation indexed the sorted array incorrectly for common sample sizes. I corrected it to a nearest-rank style index using `math.ceil`.
- The continuous monitoring script assumed UDP JSON metrics always lived at `end.sum`. I made the parser tolerant of `sum`, `sum_received`, and `sum_sent`, because iperf3 UDP JSON output differs across versions.
- The thresholds block was labeled as YAML even though it was not YAML. I relabeled it as plain text.
- The live-streaming line gave `RTT < 3s` as if RTT were a meaningful primary threshold. I replaced that with a technically correct note that throughput, loss, and player buffer depth are usually more important for buffered live streaming.
- The conclusion claimed iperf3 provided the "most accurate" jitter measurement. I softened this to "practical UDP-specific jitter measurement" because that is defensible without overstating the tool.

## Review Notes
- The latency/jitter/loss thresholds in the post are best treated as rules of thumb, not hard protocol limits; acceptable values vary by codec, game, media stack, and buffering strategy.
- `iperf3` UDP jitter is closer to RTP-style interarrival jitter than to a direct one-way latency measurement.
- The embedded Python and Bash snippets were syntax-checked locally after the edits.
