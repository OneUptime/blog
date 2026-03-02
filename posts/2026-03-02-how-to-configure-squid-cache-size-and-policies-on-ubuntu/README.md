# How to Configure Squid Cache Size and Policies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Squid, Proxy, Caching, Networking

Description: Configure Squid's cache size, storage directories, and caching policies on Ubuntu to maximize cache hit rates and reduce bandwidth consumption.

---

Squid's caching capability is its most valuable feature for bandwidth-constrained environments. When configured correctly, a Squid cache can serve frequently requested content without hitting the internet at all, reducing load times and saving bandwidth. Getting the cache configuration right requires understanding both the storage options and the policies that control what gets cached.

## How Squid Caching Works

Squid stores objects (web pages, images, files) in a local cache. When a client requests a resource, Squid checks if it has a fresh copy. If it does, it serves the cached copy directly. If not, it fetches from the origin server, stores a copy, and then delivers the content.

The effectiveness of caching depends on:
- Cache size (larger cache = more objects stored)
- Cache policy (what to cache, for how long)
- Cache hit ratio (what percentage of requests are served from cache)

## Storage Types in Squid

Squid supports four storage formats:

- `ufs` - original Unix filesystem storage, simple but not the fastest
- `aufs` - asynchronous UFS, uses threads for non-blocking I/O
- `diskd` - uses a separate process for disk I/O
- `rock` - single large file database, best for SSDs

For most Ubuntu deployments, `aufs` on spinning disks or `rock` on SSDs are the best choices.

## Configuring Cache Directories

Edit `/etc/squid/squid.conf`:

```squid
# /etc/squid/squid.conf

# Format: cache_dir TYPE DIRECTORY SIZE_MB L1_DIRS L2_DIRS
# SIZE_MB: Maximum disk usage for this cache directory
# L1_DIRS: Number of first-level subdirectories (default 16)
# L2_DIRS: Number of second-level subdirectories (default 256)

# Single cache directory on a regular disk
cache_dir aufs /var/spool/squid 10000 16 256
# 10000 MB = ~10GB cache

# Multiple cache directories (distributes I/O across disks)
# cache_dir aufs /mnt/disk1/squid 20000 16 256
# cache_dir aufs /mnt/disk2/squid 20000 16 256

# Rock store for SSD (single file, better random access)
# cache_dir rock /var/spool/squid 10000
```

If you change the cache directory, initialize it:

```bash
sudo squid -z
# This creates the subdirectory structure Squid needs
```

## Memory Cache Configuration

Squid also maintains a memory cache for the most frequently accessed objects:

```squid
# Memory for caching small, frequently accessed objects
# Rule of thumb: 256MB for every 10GB of disk cache
cache_mem 512 MB

# Maximum size of object stored in memory
maximum_object_size_in_memory 512 KB

# Maximum size of object stored on disk
maximum_object_size 256 MB

# Minimum size to cache (very small objects waste overhead)
minimum_object_size 1 KB
```

## Replacement Policies

When the cache is full, Squid must decide which objects to evict. Choose a replacement policy:

```squid
# Memory replacement policy
# lru = Least Recently Used (default, good for most cases)
# heap GDSF = optimize hit ratio for small objects
# heap LFUDA = optimize byte hit ratio for large objects
memory_replacement_policy lru

# Disk replacement policy
# Same options as memory replacement
cache_replacement_policy heap LFUDA
```

GDSF (Greedy Dual Size Frequency) is good when you want to maximize the number of cache hits. LFUDA (Least Frequently Used with Dynamic Aging) is better when you want to maximize bytes served from cache. For general web caching, `lru` is a reasonable starting point.

## Object Refresh Policies

Refresh policies control how long Squid considers an object fresh before re-validating it with the origin server:

```squid
# refresh_pattern REGEX MIN PERCENT MAX [options]
# MIN: Minimum TTL in minutes (cache for at least this long)
# PERCENT: % of object's age to consider it fresh
# MAX: Maximum TTL in minutes (never cache longer than this)

# Cache CGI/dynamic content for a short time
refresh_pattern -i /cgi-bin/     0  0%     0

# FTP files - cache for a while
refresh_pattern ^ftp:            1440 20%  10080

# Gopher - old protocol, cache indefinitely
refresh_pattern ^gopher:         1440 0%   1440

# Default rule for HTTP
refresh_pattern .                0    20%  4320

# Aggressive caching for static assets
# Cache images for at least 1 day, up to 7 days
refresh_pattern -i \.(jpg|jpeg|png|gif|ico|css|js)$ 1440 50% 10080

# Override-stale: use cached copy even if server says it's stale
# Useful for saving bandwidth when origin server is slow
refresh_pattern -i \.(zip|exe|msi|dmg)$ 10080 90% 43200 override-expire
```

## Access Control for Caching

You can control what gets cached using ACLs with the `no_cache` directive:

```squid
# Do not cache authenticated requests
acl authenticated_request proxy_auth REQUIRED
no_cache deny authenticated_request

# Do not cache certain domains (real-time data)
acl no_cache_domains dstdomain .stock-ticker.com .live-scores.com
no_cache deny no_cache_domains

# Do not cache POST requests (they change server state)
acl POST_request method POST
no_cache deny POST_request

# Do not cache URLs with query strings (usually dynamic)
acl has_query url_regex \?
no_cache deny has_query
```

## Cache Hierarchy: ICP and HTCP

For large deployments with multiple Squid instances, you can set up a cache hierarchy where sibling caches share their cached content:

```squid
# Set up as a sibling cache
# ICP (Internet Cache Protocol) for cache peering
icp_port 3130

# Define a parent cache
# cache_peer parent-proxy.example.com parent 3128 3130 no-query no-digest

# Define sibling caches
# cache_peer sibling1.example.com sibling 3128 3130
# cache_peer sibling2.example.com sibling 3128 3130

# Only query peers for cache misses
cache_peer_access parent-proxy allow all
```

## Monitoring Cache Performance

The most important metric is the cache hit ratio:

```bash
# Check cache statistics via the manager interface
# First enable it in squid.conf:
# cachemgr_passwd your-secret-password all

curl --user admin:your-secret-password \
    "http://localhost:3128/squid-internal-mgr/info"

# Or use squidclient
squidclient -h localhost mgr:info

# Get detailed cache statistics
squidclient -h localhost mgr:counters

# Check cache hit rates
squidclient -h localhost mgr:5min | grep "Request Hit"
```

Parse the access log for hit ratio:

```bash
# Count cache HITs vs MISSes
sudo awk '{print $4}' /var/log/squid/access.log | \
    grep -oP 'TCP_\w+' | sort | uniq -c | sort -rn

# Calculate hit ratio
HITS=$(sudo grep "TCP_HIT\|TCP_MEM_HIT\|TCP_STALE_HIT" /var/log/squid/access.log | wc -l)
TOTAL=$(sudo wc -l < /var/log/squid/access.log)
echo "Hit ratio: $(echo "scale=2; $HITS * 100 / $TOTAL" | bc)%"
```

## Forcing Cache Refresh

When you know an object has changed and want to clear it from the cache:

```bash
# Purge a specific URL from the cache
squidclient -m PURGE http://example.com/file.pdf

# Reload entire cache (use sparingly - destroys cache effectiveness)
sudo squid -k rotate
```

## Optimizing for a Slow Internet Connection

If you are in an environment with limited bandwidth:

```squid
# Store large files aggressively
maximum_object_size 1024 MB

# Keep objects for longer
refresh_pattern . 60 50% 43200 override-expire ignore-reload

# Increase memory cache for frequently accessed objects
cache_mem 1024 MB

# Use stale cache objects if origin is unreachable
stale_if_error 86400
```

After making changes to cache configuration, always validate and reload:

```bash
sudo squid -k parse
sudo squid -k reconfigure
```

A well-tuned Squid cache can achieve hit ratios of 40-60% for typical office browsing, which translates directly into bandwidth savings and faster page loads for users.
