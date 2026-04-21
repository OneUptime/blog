# How to Set Up Squid Delay Pools for Bandwidth Limiting by IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Delay Pools, IPv4, Bandwidth, QoS, Rate Limiting

Description: Configure Squid delay pools to limit bandwidth consumption per IPv4 address or subnet, implementing QoS policies that prevent individual users from saturating shared links.

## Introduction

Squid delay pools throttle cache-miss downloads for specific clients or URL patterns. Rather than dropping connections, delay pools use bandwidth buckets to enforce transfer limits, useful for corporate proxies where fair-use policies need enforcement. The classic `delay_*` directives require Squid built with `--enable-delay-pools` and are available in Squid 7 and earlier, but not Squid 8.

## Delay Pool Types

| Class | Description |
|---|---|
| Class 1 | One aggregate pool for all traffic |
| Class 2 | Aggregate pool + individual bucket chosen from IPv4 bits 25-32 |
| Class 3 | Aggregate + network bucket from IPv4 bits 17-24 + individual bucket from bits 17-32 |

## Class 3 Delay Pool (Per-Host Limiting)

```conf
# /etc/squid/squid.conf

http_port 127.0.0.1:3128
http_port 10.0.0.1:3128

# Access control

acl localhost src 127.0.0.1/32
acl manager url_regex -i ^cache_object:// /squid-internal-mgr/
acl internal src 10.0.0.0/16
http_access allow localhost manager
http_access deny manager
http_access allow internal
http_access deny all

# Define how many delay pools
delay_pools 2

# Pool 1: Normal users - bandwidth limited
delay_class 1 3    # Class 3: aggregate + network + individual host limits

# Pool 1 parameters:
# delay_parameters <pool> <aggregate> <network> <individual>
# Format: rate/max_burst (bytes/s / max bytes)
# none = unlimited
# Aggregate: 10 MB/s total; network: 5 MB/s per /24 inside 10.0.0.0/16;
# individual: 100 KB/s with a 200 KB maximum bucket
delay_parameters 1 10240000/10240000 5120000/5120000 102400/204800

# Apply pool 1 to internal clients (except fast_users)
acl slow_users src 10.0.0.0/16
acl fast_users src 10.0.1.100 10.0.1.101  # Admins/servers

# Pool 2: Unlimited for specific hosts
delay_class 2 3
delay_parameters 2 none none none   # All unlimited

delay_access 1 deny fast_users     # delay_access checks pool 1 before pool 2
delay_access 1 allow slow_users    # Apply limit to everyone else
delay_access 1 deny all

delay_access 2 allow fast_users    # No delay for fast_users
delay_access 2 deny all
```

## Limiting by File Extension

Throttle large file URLs but not web browsing:

```conf
delay_pools 1
delay_class 1 2    # Class 2: aggregate + individual bucket

# Limit matching files to 1 MB/s aggregate and 512 KB/s per individual bucket
delay_parameters 1 1048576/2097152 524288/1048576

# ACL for large file extensions in the URL path
acl large_downloads urlpath_regex -i \.(iso|mp4|mkv|zip|tar|gz|rar)$

delay_access 1 allow large_downloads
delay_access 1 deny all
```

## Testing Bandwidth Limits

```bash
# Download a large file through proxy and measure speed
curl -x http://10.0.0.1:3128 -o /dev/null \
  -w '\nAverage speed: %{speed_download} bytes/s\n' \
  http://ipv4.download.thinkbroadband.com/100MB.zip

# Expected: transfer rate should be throttled to ~100 KB/s per host

# Check Squid stats
curl -sS http://127.0.0.1:3128/squid-internal-mgr/delay | grep -Ei 'delay pools|pool|class'

# Check delay pool configuration messages or errors
sudo tail -f /var/log/squid/cache.log | grep --line-buffered delay
```

## Conclusion

Squid delay pools implement bandwidth throttling without dropping connections. Class 3 pools provide three tiers of limits: aggregate (total), network bucket, and individual host bucket. Set rates in bytes-per-second with burst allowances, apply different pools to different client groups via `delay_access`, and use `none` for unlimited tiers. Test with large file downloads to verify throttling behavior matches your policy.
