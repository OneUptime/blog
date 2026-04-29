# Validation Summary: How to Measure Network Throughput with iperf3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- iperf3
- TCP
- UDP
- `jq`
- `apt-get`
- `dnf`
- Homebrew

## Sources Consulted
- ESnet iperf3 documentation: https://software.es.net/iperf/
- ESnet iperf3 manual / invoking guide: https://software.es.net/iperf/invoking.html
- ESnet iperf3 FAQ: https://software.es.net/iperf/faq.html
- ESnet Fasterdata iperf2 / iperf3 guide: https://fasterdata.es.net/performance-testing/network-troubleshooting-tools/iperf/
- ESnet Fasterdata note on multi-stream iperf3 and threading: https://fasterdata.es.net/performance-testing/network-troubleshooting-tools/iperf/multi-stream-iperf3/
- ESnet iperf source for JSON field names and summaries (`src/iperf_api.c`): https://github.com/esnet/iperf/blob/master/src/iperf_api.c
- ESnet iperf release notes (`RELNOTES.md`): https://github.com/esnet/iperf/blob/master/RELNOTES.md
- Debian package page for `iperf3`: https://packages.debian.org/stable/net/iperf3
- Fedora package page for `iperf3`: https://packages.fedoraproject.org/pkgs/iperf3/iperf3/
- Homebrew formula for `iperf3`: https://formulae.brew.sh/formula/iperf3

## Issues Found
- The `-P 4` example showed output that looked like a single-stream summary (`[ 4]`) instead of a parallel-stream total. I updated it to a `[SUM]` example so it matches actual `iperf3` multi-stream output.
- The UDP sample output reported only `2500` datagrams for a 30-second transfer near `987 Mbits/sec`, which is far too low. I corrected the sample to use a plausible multi-million datagram count.
- Step 6 described `-M` and `-Z` as buffer-size tuning even though `-M` sets MSS and `-Z` enables zero-copy sending. I corrected the section heading and intro text so the commands are described accurately.
- The explanation around parallel streams was too absolute for current `iperf3` behavior. I softened the wording so it reflects that multiple streams can help, but are not universally required to saturate a link.
- The introduction implied iperf3 always sends traffic "as fast as possible." I clarified that UDP send rate is explicitly controlled with `-b`.

## Review Notes
- `iperf3` added multi-threaded parallel streams in version `3.16`; older guidance about multi-stream tests being single-threaded is now mostly historical.
- Upstream release notes for `iperf-3.21` note that `--set-mss` still does not work reliably in all cases, even though the option remains current and documented.
- The local environment did not have `iperf3` installed, so command behavior was verified against ESnet's current documentation, source tree, and release notes rather than local `iperf3 --help` output.
