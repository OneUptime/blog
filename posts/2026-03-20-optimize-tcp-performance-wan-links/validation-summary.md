# Validation Summary: How to Optimize TCP Performance for High-Latency WAN Links

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel TCP stack (sysctl tunables under `net.ipv4.*` and `net.core.*`)
- TCP congestion control (BBR vs CUBIC)
- TCP thin streams (`tcp_thin_linear_timeouts`)
- TCP keepalive (`tcp_keepalive_time` / `intvl` / `probes`)
- TCP retransmission tuning (`tcp_syn_retries`, `tcp_synack_retries`, `tcp_retries1`, `tcp_retries2`)
- Bandwidth-Delay Product (BDP) sizing of socket buffers
- `tc` / `netem` for WAN latency emulation
- `iperf3` for throughput testing
- `fq` qdisc (required by BBR for pacing)

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` — https://docs.kernel.org/networking/ip-sysctl.html
- `tcp(7)` manpage (man-pages project) — defaults for keepalive, retries, syn/synack retries
- Linux 4.11 changelog on KernelNewbies — https://kernelnewbies.org/Linux_4.11 (documents removal of `thin_dupack`, FACK, ER, NCR, FR when RACK was enabled)
- Linux kernel TCP thin streams docs — https://docs.kernel.org/networking/tcp-thin.html
- Red Hat KB 6957063 — confirms `tcp_thin_dupack` is unavailable on RHEL 8+
- RFC 2861 — TCP Congestion Window Validation (basis for `tcp_slow_start_after_idle`)
- RFC 5681 — TCP Congestion Control (slow start / CUBIC behavior)
- BBR documentation — https://github.com/google/bbr (qdisc requirement, behavior on lossy links)

## Issues Found

1. **`net.ipv4.tcp_thin_dupack` is no longer a valid sysctl on modern kernels.**
   - The post recommended `sudo sysctl -w net.ipv4.tcp_thin_dupack=1` in Step 4.
   - This sysctl was **removed in Linux 4.11** (April/May 2017) when RACK loss detection was made the default; the heuristic became redundant.
   - On any current kernel (RHEL 8+, Ubuntu 18.04+, etc.) running this command fails with `No such file or directory`.
   - **Fix:** Removed the `tcp_thin_dupack=1` line and added a brief inline note explaining why it is no longer needed/available, while keeping the still-valid `tcp_thin_linear_timeouts=1` recommendation.

2. **Inverted explanation of `tcp_slow_start_after_idle = 0`.**
   - The original comment in Step 2 read: *"Slow start after idle - reduce to avoid large initial bursts"*. This is backwards.
   - Per kernel docs and RFC 2861: when set to **1** (default), the congestion window is timed out after an idle period, forcing slow-start on resume — this *prevents* a burst. When set to **0**, the cwnd is **retained** across idle periods, so the application can blast a full (potentially large) cwnd of data on resume — this *enables* a burst rather than avoiding one.
   - **Fix:** Rewrote the comment to accurately describe the effect: disabling cwnd reset preserves the grown congestion window so bursty WAN traffic does not have to slow-start back up after every idle gap. Step 3's prose explanation was already correct and was left unchanged.

3. **Misleading "increase keepalive settings" comment.**
   - The original comment said "Increase keepalive settings for WAN idle connections", but the values used (`time=300`, `intvl=30`) are actually a *decrease* from the kernel defaults (`7200`, `75`). The intent — more aggressive probing to detect dead WAN/NAT-traversed connections faster — is reasonable, but the wording was wrong.
   - **Fix:** Reworded to "More aggressive keepalive (defaults: 7200s / 75s / 9) so dead WAN connections and NAT/firewall idle-timeouts are detected faster". This clarifies both the direction of change and the rationale.

## Review Notes

- **BDP arithmetic in Step 1 is correct** (100 Mbps × 80 ms = 1 MB).
- **BBR + `fq` qdisc pairing in Step 2 is correct.** BBR before kernel 4.13 strictly required `fq`; from 4.13 onward it can also work with `pfifo_fast` because BBR gained internal pacing support. Recommending `fq` is still the safest, most portable advice.
- **`tc qdisc add dev lo root netem delay 80ms loss 0.1%` is syntactically correct.** Step 6 implicitly assumes an `iperf3 -s` server is already running on `127.0.0.1`; this is a minor omission but not a technical error.
- **`tcp_retries1 = 3` is the kernel default**, so this line is a no-op rather than a tuning change. Left as-is because it does not introduce incorrect behavior — it just makes the default explicit.
- **`tcp_retries2 = 8`** (vs default 15) is an aggressive choice that can prematurely tear down long-lived connections on flaky intercontinental links. The author's framing (faster failure detection) is defensible, so this is left as a deliberate tuning choice rather than an error.
- The "BBR typically delivers 2–5× better throughput than CUBIC on lossy WAN links" claim in the conclusion is consistent with Google's published BBR results on lossy paths; not modified.
- The post's `Description` mentions "TCP optimization appliances" but the body does not actually cover them. This is a minor metadata mismatch, not a technical error, so left unchanged.
