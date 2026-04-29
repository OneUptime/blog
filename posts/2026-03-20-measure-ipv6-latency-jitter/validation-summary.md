# Validation Summary: How to Measure IPv6 Latency and Jitter - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- `ping` (`iputils`)
- `fping`
- Python `subprocess`
- Python `statistics`
- `awk`

## Sources Consulted
- Installed `ping -h` / `man ping` output from `iputils`
- `iputils` upstream repository: https://github.com/iputils/iputils
- `fping` official manual: https://www.fping.org/fping.8.html
- `fping` upstream repository and changelog: https://github.com/schweikert/fping
- `hping` official site: https://www.hping.org/download/
- `hping` upstream repository: https://github.com/antirez/hping
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `statistics` documentation: https://docs.python.org/3/library/statistics.html

## Issues Found
- The post used legacy `ping6` and `fping6` command names. Current upstream documentation uses `ping -6` and `fping -6`, so the commands and Python example were updated accordingly.
- The explanation of `ping`'s `mdev` described it as an approximation of jitter. Upstream `ping(8)` defines `mdev` as the population standard deviation of RTTs, so the text was corrected to avoid conflating RTT variability with jitter.
- The example address `2001:db8::target` was not a valid IPv6 literal. It was replaced with the syntactically valid documentation-prefix example `2001:db8::1`.
- The `hping3 --ipv6` example was not valid. The current upstream `hping3` option set does not expose a `--ipv6` flag, and the project is no longer actively developed, so that section was replaced with an `fping -6`-based jitter workflow that matches documented behavior.
- The original `awk` jitter calculation divided by the number of samples instead of the number of consecutive sample deltas. The corrected version divides by `seen - 1` and skips lost probes.
- The continuous monitoring section used `fping6 -l -p 1000 -q` and then parsed `avg=...`, but `-q` only emits final summaries unless combined with `-Q`, and the shown parser did not match documented `fping` output. The section was rewritten to use `fping -6 -C 1 -q` in a loop, which produces parseable per-target RTT output.
- The Python example used `statistics.stdev`, which computes sample standard deviation. It was changed to `statistics.pstdev` to align better with the full observed RTT set and with `ping`'s documented `mdev` interpretation.

## Review Notes
- `hping` remains useful in some environments, but its official site states that it is no longer actively developed. For IPv6 latency/jitter measurement, `ping -6` and `fping -6` are the safer tools to recommend in a current how-to.
