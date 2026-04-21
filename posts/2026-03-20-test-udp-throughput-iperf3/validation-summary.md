# Validation Summary: How to Test UDP Throughput with iperf3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iperf3
- UDP throughput testing
- Packet loss and jitter measurement
- Bash scripting
- Python JSON parsing

## Sources Consulted
- ESnet iperf3 3.21 documentation, "Invoking iperf3": https://software.es.net/iperf/invoking.html
- ESnet iperf3 3.21 source, `src/iperf_api.c` JSON summary output: https://github.com/esnet/iperf/blob/3.21/src/iperf_api.c
- ESnet iperf3 3.21 source, `src/iperf_locale.c` human-readable UDP output formats: https://github.com/esnet/iperf/blob/3.21/src/iperf_locale.c
- ESnet iperf3 release notes: https://github.com/esnet/iperf/blob/3.21/RELNOTES.md

## Issues Found
1. **UDP bitrate option wording implied `-b` is required**: The post said `-b` is required for UDP. iperf3 accepts UDP tests without `-b`, but defaults to 1 Mbit/sec. **Fix:** Reworded the note to say the target bitrate should be set explicitly because UDP defaults to 1 Mbps.
2. **Sample UDP sender output showed receiver-only jitter/loss columns**: Current iperf3 source formats UDP sender lines with total datagrams, while receiver lines include jitter and lost/total datagrams. **Fix:** Adjusted the sample sender line to show the datagram count instead of jitter/loss.
3. **Sweep test parsed the ambiguous UDP JSON `sum` object for receiver bitrate**: ESnet's source marks the legacy UDP `sum` object as ambiguous and emits `sum_sent` / `sum_received` for complete sender and receiver information. **Fix:** Changed the sweep parser to read receiver bitrate, loss, and jitter from `end.sum_received`.
4. **VoIP calculation and bitrate were incorrect**: The post calculated 100 calls * 50 pps * 200 bytes as 1000 pps and 200 KB/s, then used `-b 200K`. The correct payload calculation is 5000 pps and 1 MB/s, or 8 Mbits/sec. **Fix:** Corrected the arithmetic and changed the iperf3 bitrate to `-b 8M`.
5. **JSON parsing example mixed ambiguous and current UDP summary fields**: The example used `end.sum` for sent bitrate, loss, jitter, and packet counts while using `sum_received` only for received bitrate. **Fix:** Changed the parser to use `sum_sent` for sent throughput and sent packet count, and `sum_received` for received throughput, loss, jitter, and lost packet count.
6. **Bidirectional-loss explanation was too absolute**: Different loss by direction can indicate path asymmetry, but host limits, queues, or local drops can also contribute. **Fix:** Reworded the comment to "can indicate" an asymmetric path issue.

## Review Notes
- The documented `-u`, `-b`, `-t`, `-l`, `-R`, `--bidir`, and `-J` options are valid in current iperf3 documentation. `--bidir` is available in modern iperf3 and was introduced in iperf 3.7.
- The local environment did not have `iperf3` installed, so commands were not executed locally. The review used ESnet's current documentation and tagged 3.21 source instead.
- Older iperf3 versions may have different UDP JSON behavior; the corrected examples match the current ESnet 3.21 source.
