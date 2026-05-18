# Validation Summary: How to Use ab (ApacheBench) for Web Server Benchmarking on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ApacheBench (ab) — Apache HTTP Server benchmarking tool
- apache2-utils Ubuntu package
- nginx (used in sample output)
- gnuplot (used for plotting timing data)
- Bash scripting (loops, awk, grep)
- HTTP (KeepAlive, Basic auth, cookies, custom headers)

## Sources Consulted
- Official Apache HTTP Server 2.4 ab documentation: https://httpd.apache.org/docs/2.4/programs/ab.html
- Apache httpd `support/ab.c` source code (trunk): https://github.com/apache/httpd/blob/trunk/support/ab.c
- Ubuntu `apache2-utils` package documentation

## Issues Found

1. **Incorrect definition of `Processing` in Connection Times** (line 123)
   - Original: "Processing - Time from connected to first byte received"
   - Issue: In ab's source (`output_results()`), Processing is calculated as `Total - Connect`, which corresponds to `c->end - c->connect` — i.e., from connection established through the **last** byte of response received. It includes request-write time, waiting/TTFB, and response-read time.
   - Fix: Updated to "Time from connection established to the last byte of the response received (includes request write, server processing, and response read)".

2. **Incorrect claim that `Waiting` equals `Processing`** (line 124)
   - Original: "Waiting - Same as Processing (time to first byte)"
   - Issue: `Waiting` is `c->beginread - c->endwrite` (request fully sent → first byte of response received, i.e., TTFB). It is a sub-interval of Processing, not equal to it. They appear similar in the sample output only because the response body is small.
   - Fix: Updated to "Time from request fully sent to the first byte of response received (time to first byte)".

3. **Incorrect definition of `Failed requests`** (line 119)
   - Original: "Any non-2xx/3xx responses, connection errors, or timeouts."
   - Issue: Per ab.c, the `Failed requests` counter (`metrics.bad`) is incremented only for the four categories `err_conn`, `err_recv`, `err_length`, and `err_except`. Non-2xx responses are tracked in a separate `err_response` counter and reported on a dedicated `Non-2xx responses:` line — they are NOT counted as failed requests.
   - Fix: Rewrote to accurately describe the four failure categories and clarify that non-2xx responses are reported separately.

4. **Misleading description of second `Time per request` line** (line 117)
   - Original: "Same as above divided by concurrency. This is the actual throughput measurement."
   - Issue: This metric is `timetaken * 1000 / done` = `1000 / RPS`. It is a per-request latency expressed in ms, not a "throughput measurement" (throughput would be RPS itself).
   - Fix: Clarified that it equals `1000 / RPS` and represents the average server-side time per request.

## Review Notes

- All thirteen documented ab flags in the Key Options table were verified against the Apache 2.4 documentation and ab.c source — all are correct, including the `-s` default of 30 seconds (available since 2.4.4) and the `-v` verbosity range (meaningful levels 1–4).
- The mathematical formula `(Concurrency * Time_taken) / Total_requests` for the first `Time per request` is dimensionally correct (yields seconds when Time_taken is in seconds); ab itself multiplies by 1000 to display ms. Left as-is.
- The sample output values are internally consistent: 50 × 2.847 / 1000 × 1000 ≈ 142.35 ms (mean), 2.847 / 1000 × 1000 ≈ 2.847 ms (mean across concurrent).
- The post's caveat about benchmarking on localhost inflating numbers is accurate and important.
- The recommendation to consider `wrk`, `k6`, `Locust`, or `JMeter` for more sophisticated load testing is appropriate; ab is single-threaded and limited.
- The `apr_socket_recv: Connection reset by peer` and `Socket: Too many open files` troubleshooting tips are accurate and commonly encountered.
