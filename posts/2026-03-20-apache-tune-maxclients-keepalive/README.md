# How to Tune Apache MaxClients and KeepAlive for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Performance, IPv4, MaxClients, Keepalive, Tuning, Mpm_prefork

Description: Learn how to tune Apache's MaxClients (MaxRequestWorkers) and KeepAlive settings to handle high IPv4 connection volumes without exhausting server memory.

---

Two of the most impactful Apache performance settings are `MaxRequestWorkers` (formerly `MaxClients`) and `KeepAlive`. Misconfiguring them causes either connection refusals under load or excessive memory consumption that crashes the server.

## Understanding the MPM

Apache's concurrency model depends on which MPM (Multi-Processing Module) is active.

```bash
# Check which MPM is active

apache2ctl -V | grep "Server MPM"
# or
apachectl -M | grep mpm
```

- **prefork** - one process per connection (PHP legacy); uses `MaxRequestWorkers`.
- **worker** - hybrid threads; uses `MaxRequestWorkers` and `ThreadsPerChild`.
- **event** - best for keep-alive (default on modern Apache); similar to worker.

## Calculating MaxRequestWorkers

The formula for prefork:

```text
MaxRequestWorkers = (Available RAM) / (RAM per Apache process)
```

Check per-process memory:

```bash
# Average memory per Apache worker in MB
ps -C apache2 -o rss= | awk '{sum+=$1; count++} END {if (count) print sum/count/1024 " MB avg"}'
```

Example: 512 MB RAM, 20 MB per process → `MaxRequestWorkers 25` (leave headroom for OS).

## Configuring mpm_prefork

```apacheconf
# /etc/apache2/mods-available/mpm_prefork.conf

<IfModule mpm_prefork_module>
    StartServers         5       # Initial worker processes on startup
    MinSpareServers      5       # Minimum idle workers kept warm
    MaxSpareServers     10       # Maximum idle workers before killing extras
    MaxRequestWorkers   50       # Hard cap on concurrent connections
    MaxConnectionsPerChild 1000  # Recycle child processes after N connections (prevents memory leaks)
</IfModule>
```

## Configuring mpm_event (Recommended for Keep-Alive)

```apacheconf
# /etc/apache2/mods-available/mpm_event.conf

<IfModule mpm_event_module>
    StartServers         2
    MinSpareThreads     25
    MaxSpareThreads     75
    ThreadsPerChild     25
    MaxRequestWorkers  150
    MaxConnectionsPerChild 1000
</IfModule>
```

## Tuning KeepAlive

KeepAlive allows a single TCP connection to carry multiple HTTP requests, reducing handshake overhead for IPv4 clients.

```apacheconf
# /etc/apache2/apache2.conf

# Enable persistent connections
KeepAlive On

# Maximum requests per connection (prevents one client monopolizing a worker)
MaxKeepAliveRequests 100

# Seconds to wait for the next request on a persistent connection
# Lower values free workers faster under heavy load
KeepAliveTimeout 5
```

## Event MPM and KeepAlive

With `mpm_event`, keep-alive connections are handled by a dedicated listener thread, so idle persistent connections do not block worker threads. This makes `KeepAliveTimeout` less critical to tune aggressively.

## Monitoring Under Load

```bash
# Show machine-readable server status (requires mod_status)
curl -s http://127.0.0.1/server-status?auto | head -30

# Count IPv4 connections on ports 80/443 by TCP state
ss -4tanH state all '( sport = :80 or sport = :443 )' | awk '{print $1}' | sort | uniq -c | sort -rn

# Watch error log for MaxRequestWorkers hits
tail -f /var/log/apache2/error.log | grep "MaxRequestWorkers"
```

## Key Takeaways

- Calculate `MaxRequestWorkers` based on available RAM divided by per-process memory.
- Use `mpm_event` with `KeepAlive On` for the best performance under IPv4 high-traffic loads.
- Keep `KeepAliveTimeout` low (2-5 seconds) on busy servers to free workers quickly.
- Set `MaxConnectionsPerChild` to recycle child processes and prevent long-term memory bloat.
