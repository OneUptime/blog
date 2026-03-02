# How to Flush the DNS Cache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Networking, systemd-resolved, Troubleshooting

Description: How to flush the DNS cache on Ubuntu using systemd-resolved, nscd, and dnsmasq depending on which resolver your system uses.

---

When DNS records change - after migrating a service to a new server, for example - cached records can cause connections to continue going to the old IP for a period of time. Flushing the DNS cache forces your system to fetch fresh records from authoritative servers immediately.

The right method for flushing the DNS cache on Ubuntu depends on which DNS resolver is running. Modern Ubuntu uses `systemd-resolved` by default, but some setups use `nscd` or `dnsmasq`.

## Identify Your DNS Resolver

Before flushing anything, check which resolver is active:

```bash
# Check if systemd-resolved is running
systemctl status systemd-resolved

# Check if nscd is running
systemctl status nscd

# Check if dnsmasq is running
systemctl status dnsmasq

# See what /etc/resolv.conf points to
ls -la /etc/resolv.conf
```

If `resolv.conf` is a symlink to `/run/systemd/resolve/stub-resolv.conf` or `/run/systemd/resolve/resolv.conf`, you're using `systemd-resolved`.

## Flushing the Cache with systemd-resolved

This is the method for most Ubuntu 18.04+ systems:

```bash
# Flush all DNS caches in systemd-resolved
sudo resolvectl flush-caches
```

Verify the flush worked by checking statistics before and after:

```bash
# Check cache statistics before
resolvectl statistics

# Flush
sudo resolvectl flush-caches

# Check again - CurrentCacheSize should be 0 or lower
resolvectl statistics
```

Sample output from `resolvectl statistics`:

```
Transactions
Current Transactions: 0
  Total Transactions: 1247

Cache
  Current Cache Size: 23
          Cache Hits: 891
        Cache Misses: 356

DNSSEC Verdicts
        Secure: 0
      Insecure: 356
         Bogus: 0
 Indeterminate: 0
```

After flushing, `Current Cache Size` should drop to 0.

### Alternative Method: Restart systemd-resolved

If the flush command does not behave as expected, restarting the service also clears the cache:

```bash
sudo systemctl restart systemd-resolved
```

However, restarting briefly interrupts DNS resolution for any queries in flight, so prefer `flush-caches` when possible.

## Flushing with nscd

`nscd` (Name Service Caching Daemon) is an older caching daemon sometimes used on Ubuntu:

```bash
# Flush nscd caches (all databases)
sudo nscd --invalidate=hosts

# Or restart nscd to clear everything
sudo systemctl restart nscd
```

The `--invalidate=hosts` option flushes only the hosts (DNS) cache. Other databases like `passwd` and `group` are not affected.

## Flushing with dnsmasq

If `dnsmasq` is used as the caching resolver (common when NetworkManager manages DNS):

```bash
# Send SIGHUP to dnsmasq to clear its cache
sudo pkill -HUP dnsmasq

# Or restart the service
sudo systemctl restart dnsmasq

# If dnsmasq is managed by NetworkManager
sudo systemctl restart NetworkManager
```

## Checking Which Cache Was Actually Used

To confirm a resolution is bypassing the cache after flushing, watch the cache miss counter:

```bash
# Get current cache miss count
resolvectl statistics | grep "Cache Misses"

# Do a lookup
dig example.com

# Check again - misses should increment by 1
resolvectl statistics | grep "Cache Misses"
```

You can also use `dig` with a direct query to bypass the local resolver entirely:

```bash
# Query the authoritative DNS server directly, bypassing local cache
dig example.com @8.8.8.8
```

If the direct query returns a different IP than the cached result, you know the cache needs flushing.

## DNS Cache After Record Changes

When you know you need fresh records for a specific domain (for example, right after a DNS migration):

```bash
# Flush the cache
sudo resolvectl flush-caches

# Verify the new record is being returned
dig example.com
```

Check the TTL on the returned record:

```bash
# The TTL is shown in the answer section
dig +nocmd example.com +noall +answer
```

Output:
```
example.com.            3474    IN      A       93.184.216.34
```

The number `3474` is the remaining TTL in seconds. Even after flushing your local cache, the upstream resolver (your ISP or public DNS) may still have the old record cached until its TTL expires. There is no way to force an external resolver to flush its cache.

## Flushing on Desktop Ubuntu

Desktop Ubuntu typically uses NetworkManager along with a locally-running `dnsmasq` or `systemd-resolved`. Check your setup:

```bash
# Check NetworkManager's DNS mode
cat /etc/NetworkManager/NetworkManager.conf | grep dns

# If dns=dnsmasq
sudo pkill -HUP dnsmasq

# If dns=systemd-resolved (or default)
sudo resolvectl flush-caches
```

Alternatively, toggle the network connection off and back on via the network menu, which also resets the DNS cache.

## Scripting Cache Flushes

For automation or deployment scripts where DNS changes are made and you need fresh resolution immediately:

```bash
#!/bin/bash
# Flush DNS cache after updating DNS records

echo "Flushing DNS cache..."

if systemctl is-active --quiet systemd-resolved; then
    # systemd-resolved is running - use resolvectl
    sudo resolvectl flush-caches
    echo "Flushed systemd-resolved cache"
elif systemctl is-active --quiet nscd; then
    # nscd is running
    sudo nscd --invalidate=hosts
    echo "Flushed nscd hosts cache"
elif systemctl is-active --quiet dnsmasq; then
    # dnsmasq is running
    sudo pkill -HUP dnsmasq
    echo "Flushed dnsmasq cache"
else
    echo "No recognized DNS cache service found"
fi

# Verify new record
echo "Resolved address:"
dig +short example.com
```

## Common Scenarios

### After Updating /etc/hosts

Changes to `/etc/hosts` take effect immediately without any cache flush needed - the file is read on each lookup, not cached.

### After a DNS Migration

```bash
# 1. Flush local cache
sudo resolvectl flush-caches

# 2. Test with a specific authoritative server
dig @ns1.newprovider.com example.com

# 3. Test through your normal resolver
dig example.com

# 4. If still returning old IP, the upstream resolver TTL has not expired yet
# Check the TTL and wait, or try an alternative resolver
dig @1.1.1.1 example.com
dig @8.8.8.8 example.com
```

### In Containerized Environments

Container DNS caches are independent of the host. If running applications in Docker or LXC, flush DNS inside the container:

```bash
# Inside a Docker container
docker exec mycontainer resolvectl flush-caches
# or
docker exec mycontainer systemctl restart systemd-resolved
```

DNS cache management is a basic but important skill. The most common mistake is flushing only the local cache without checking whether upstream resolvers are also holding stale records - always verify with a direct query to a public resolver to confirm what the rest of the world sees.
