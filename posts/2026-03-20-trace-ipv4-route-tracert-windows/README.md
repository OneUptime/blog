# How to Trace an IPv4 Route with tracert on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Tracert, IPv4, Route Tracing, Diagnostic

Description: Use tracert on Windows to trace the IPv4 path to a destination, interpret each hop's latency and IP address, and identify where packet loss or delays occur.

## Introduction

`tracert` (Trace Route) sends ICMP Echo requests with increasing TTL values, causing each router along the path to return a "Time Exceeded" message. This reveals the path taken by packets and the latency at each hop.

## Basic tracert

```cmd
:: Trace route to google.com
tracert google.com

:: Trace route to an IP address
tracert 8.8.8.8
```

## Reading tracert Output

```text
Tracing route to google.com [142.250.80.46]
over a maximum of 30 hops:

  1     1 ms     1 ms     1 ms  192.168.1.1
  2     5 ms     5 ms     6 ms  10.100.0.1
  3    12 ms    11 ms    12 ms  203.0.113.1
  4     *        *        *     Request timed out.
  5    18 ms    17 ms    18 ms  72.14.232.1
  6    20 ms    19 ms    20 ms  142.250.80.46
```

| Element | Meaning |
|---|---|
| Column 1 | Hop number |
| Columns 2-4 | RTT for three probes (ms) |
| Last column | IP/hostname of the router |
| `* * *` | No response before the timeout (ICMP Time Exceeded may be filtered or rate-limited) |

## Useful Options

```cmd
:: Suppress reverse DNS lookups (faster output)
tracert -d 8.8.8.8

:: Set maximum number of hops (default 30)
tracert -h 15 8.8.8.8

:: Set timeout per probe in milliseconds
tracert -w 2000 8.8.8.8

:: Force IPv4 (useful on dual-stack systems)
tracert -4 google.com
```

## Interpreting `* * *` Hops

`* * *` does not always mean packet loss. Many routers filter ICMP "Time Exceeded" responses for security. If the trace continues past a `* * *` hop, the path is intact - only that router is not responding.

An apparent failure shows all remaining hops as `* * *` and never reaches the destination, but confirm with other tests because ICMP replies can also be filtered.

## Measuring Latency Increases

Compare RTT at each hop:
- Sudden jump from 5ms to 200ms at hop 4: possible congestion or routing issue around that hop
- Consistent high latency from hop 4 onward: possible congestion at or near hop 4
- Decreasing latency: often an ICMP prioritization artifact - not a forwarding problem by itself

## Using tracert to Find Routing Asymmetry

Run tracert in both directions (from A to B and from B to A). If the hops differ significantly, routing is asymmetric - useful to know when diagnosing firewall issues.

## PowerShell Alternative

```powershell
# PowerShell route trace

Test-NetConnection -ComputerName "google.com" -TraceRoute

# Or use the built-in tracert via cmd
cmd /c tracert -d 8.8.8.8
```

## Conclusion

`tracert -d` (skip DNS) often speeds up network path analysis. Read RTT columns as latency hints, identify where `* * *` becomes persistent, and note where elevated latency first appears and whether it continues on later hops.
