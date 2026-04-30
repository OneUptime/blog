# How to Flush DNS Cache on Linux, macOS, and Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Cache, Linux, macOS, Window, Troubleshooting

Description: Clear DNS cache on Linux (systemd-resolved, nscd, dnsmasq), macOS, and Windows to force fresh DNS lookups after record changes.

## Introduction

DNS caches store recently resolved names to improve performance. When DNS records change - during migrations, failovers, or IP changes - old cached entries can prevent clients from picking up the new values until the TTL expires. Flushing the local DNS cache forces the system to ask its configured resolver again, though upstream recursive resolvers may still serve older cached data until their TTL expires.

## Linux - systemd-resolved

```bash
# Many modern Linux distributions use systemd-resolved:

# Check if it's running:
systemctl status systemd-resolved

# Flush all DNS caches:
resolvectl flush-caches

# Inspect resolver statistics after flushing:
resolvectl statistics

# Test resolution after flush:
resolvectl query google.com
```

## Linux - nscd (Name Service Cache Daemon)

```bash
# Check if nscd is running:
systemctl status nscd

# Flush all nscd caches:
nscd -i hosts     # Flush only host/DNS cache
# Or restart:
systemctl restart nscd

# Flush other cache types:
nscd -i passwd
nscd -i group
nscd -i hosts

# Check nscd statistics:
nscd -g
```

## Linux - dnsmasq

```bash
# Check if dnsmasq is running:
systemctl status dnsmasq

# Flush dnsmasq cache (clears cache and reloads hosts-related data):
pkill -SIGHUP dnsmasq
# Or:
systemctl restart dnsmasq

# Note: SIGUSR1 causes dnsmasq to dump its cache stats to syslog,
# but does NOT flush the cache.
```

## Linux - General (All Resolvers)

```bash
# Nuclear option: restart all DNS-related services:
systemctl restart systemd-resolved
systemctl restart nscd 2>/dev/null
systemctl restart dnsmasq 2>/dev/null

# Verify the resolver now returns the expected answer:
dig +short google.com
# Compare the result with the IP you expect after the DNS change.

# Check if a domain resolves to the expected IP after flush:
EXPECTED_IP="1.2.3.4"
RESOLVED=$(dig +short example.com | head -1)
echo "Resolved to: $RESOLVED"
echo "Expected:    $EXPECTED_IP"
```

## macOS

```bash
# macOS cache flush command (varies by OS version):

# macOS 10.15 Catalina and later:
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# macOS 10.14 Mojave:
sudo killall -HUP mDNSResponder

# macOS 10.12-10.13:
sudo killall -HUP mDNSResponder

# Verify with:
dscacheutil -q host -a name google.com
# Shows the current resolved answer
```

## Windows

```powershell
# Command Prompt or PowerShell (Run as Administrator):
ipconfig /flushdns

# Inspect the current resolver cache:
ipconfig /displaydns

# PowerShell equivalent to ipconfig /flushdns:
Clear-DnsClientCache

# Check what's currently cached:
Get-DnsClientCache | Where-Object {$_.Entry -match "example.com"}
```

## Verify the Flush Worked

```bash
# After flushing, confirm the resolver now returns the expected answer:
dig +short example.com
# Compare the result with the IP you expect after the DNS change.

# Method 2: Compare before/after flush:
IP_BEFORE=$(dig +short example.com | head -1)
resolvectl flush-caches
IP_AFTER=$(dig +short example.com | head -1)
echo "Before: $IP_BEFORE"
echo "After:  $IP_AFTER"
# If the record recently changed and IP_AFTER matches the new value,
# the local resolver picked up the update.
```

## Conclusion

DNS cache flushing procedures differ by OS and resolver: use `resolvectl flush-caches` on systemd-resolved Linux, `sudo killall -HUP mDNSResponder` on macOS, and `ipconfig /flushdns` on Windows. After flushing, verify the correct IP is returned, keeping in mind that upstream resolvers may still serve cached data until TTL expiration. For production DNS record changes, set the TTL low (e.g., 60 seconds) before the change to minimize cache propagation time - this is more reliable than relying on clients to flush their caches.
