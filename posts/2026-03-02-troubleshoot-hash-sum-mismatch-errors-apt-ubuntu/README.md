# How to Troubleshoot 'Hash Sum Mismatch' Errors in APT on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting, Networking

Description: Learn how to diagnose and fix 'Hash Sum Mismatch' errors when running apt update on Ubuntu, including cache corruption, proxy interference, and mirror synchronization issues.

---

Running `sudo apt update` and hitting a "Hash Sum Mismatch" error is one of those intermittent issues that can appear suddenly and be confusing to track down. The error looks something like this:

```text
W: Failed to fetch http://archive.ubuntu.com/ubuntu/dists/jammy/main/binary-amd64/Packages.xz
   Hash Sum mismatch
   Hashes of expected file:
    - Filesize:1234567 [weak]
    - MD5Sum:abc123... [weak]
    - SHA256:def456...
   Hashes of received file:
    - SHA256:999...
E: Some index files failed to download. They have been ignored, or old ones used instead.
```

APT verifies the checksum of every file it downloads against the checksums listed in the repository's `Release` file (which is itself GPG-signed). When they don't match, APT refuses to use the file.

## Common Causes

Before fixing anything, understand what's likely causing the problem:

1. **Stale local cache** - The most common cause. Your local package lists are partially cached from a previous state of the repository.
2. **Proxy or CDN caching** - A transparent proxy or CDN is serving a cached version of a file that no longer matches the current checksums.
3. **Mirror sync in progress** - The repository mirror is mid-synchronization, and different files are at different versions.
4. **Network corruption** - Rare but possible, especially over long-distance or wireless connections.
5. **Disk issues** - Corrupt files on disk due to hardware or filesystem problems.

## Fix 1: Clear the APT Cache

The most reliable first step is clearing the local package cache and re-downloading everything:

```bash
# Remove all cached package lists
sudo rm -rf /var/lib/apt/lists/*

# Clear the downloaded package cache too
sudo apt clean

# Now re-fetch everything fresh
sudo apt update
```

This resolves the issue the vast majority of the time. If it doesn't, move to the next steps.

## Fix 2: Check for Proxy or CDN Interference

If you're behind a proxy (corporate firewall, Squid, apt-cacher-ng), the proxy may be serving stale cached data:

```bash
# Check if a proxy is configured
env | grep -i proxy
cat /etc/apt/apt.conf.d/* | grep -i proxy

# Bypass the proxy temporarily to test
sudo apt -o Acquire::http::Proxy=DIRECT update

# If this works, the proxy is the problem
```

For corporate proxies, contact your network team to have the cached APT files purged. For `apt-cacher-ng`:

```bash
# On the apt-cacher-ng server, purge the cache
sudo apt-cacher-ng-ctl purge
# Or manually delete the cache directory
sudo rm -rf /var/cache/apt-cacher-ng/*
sudo systemctl restart apt-cacher-ng
```

## Fix 3: Switch to a Different Mirror

If the mirror you're using is in the middle of a sync, the checksums will temporarily be inconsistent. Switch to a different mirror:

```bash
# Identify your current mirror
grep "^deb " /etc/apt/sources.list | head -5

# Temporarily use the official Ubuntu archive
sudo sed -i 's|http://[^/]*/ubuntu|http://archive.ubuntu.com/ubuntu|g' /etc/apt/sources.list

# Try updating
sudo apt update
```

If this works, your regional mirror was the issue. You can switch back after it finishes syncing (usually within a few hours) or change to a different regional mirror permanently.

Ubuntu maintains a list of mirrors at https://launchpad.net/ubuntu/+archivemirrors. The `netselect-apt` tool can help pick the fastest one:

```bash
sudo apt install netselect-apt
sudo netselect-apt jammy -o /tmp/sources.list.test
cat /tmp/sources.list.test
```

## Fix 4: Disable IPv6 for APT Temporarily

On some networks, IPv6 routing issues cause intermittent download problems:

```bash
# Force APT to use IPv4
sudo tee /etc/apt/apt.conf.d/99force-ipv4 << 'EOF'
Acquire::ForceIPv4 "true";
EOF

# Then try updating
sudo apt update
```

If this fixes it, investigate your IPv6 configuration or network routing.

## Fix 5: Handle Specific File Mismatches

Sometimes only one or two files are affected. The error message tells you which file is failing. You can try fetching it directly to confirm the issue:

```bash
# The error shows the URL - try downloading it directly
curl -I "http://archive.ubuntu.com/ubuntu/dists/jammy/main/binary-amd64/Packages.xz"

# Check the content-length matches what APT expects
# Or fetch it and check the hash yourself
curl -s "http://archive.ubuntu.com/ubuntu/dists/jammy/Release" | grep -A 5 "Packages.xz"
```

## Fix 6: Check Disk and Filesystem Health

If the mismatch is in files you've already downloaded (not during download), disk corruption might be the issue:

```bash
# Check disk for errors
sudo dmesg | grep -i "error\|failed" | tail -20

# Check filesystem errors
sudo journalctl -k | grep -i "ext4\|xfs\|filesystem" | tail -20

# Verify disk health
sudo apt install smartmontools
sudo smartctl -a /dev/sda  # Replace with your disk

# Check the apt lists directory for suspicious file sizes
ls -lah /var/lib/apt/lists/
```

If you see filesystem errors, address those before dealing with APT.

## Fix 7: Check and Fix the Partial Downloads Directory

APT uses a partial download directory that can contain corrupted fragments:

```bash
# Clear partial downloads
sudo rm -rf /var/lib/apt/lists/partial/*
sudo rm -rf /var/cache/apt/archives/partial/*

# Retry the update
sudo apt update
```

## Diagnosing with Verbose Output

When the standard error isn't giving you enough information, run with debug output:

```bash
# Very verbose APT debugging
sudo apt -o Debug::Acquire::http=true update 2>&1 | grep -E "GET|Hash|Mismatch|Mirror"

# Or capture everything to a log
sudo apt update 2>&1 | tee /tmp/apt-debug.log
cat /tmp/apt-debug.log | grep -E "Err|Hash|Mismatch"
```

## Dealing with Repositories Added by Third Parties

If the mismatch is in a third-party PPA or external repository, the problem might be with that repository specifically:

```bash
# Find which source has the failing file
apt update 2>&1 | grep "Failed\|Hash Sum"

# Temporarily disable the problematic source
sudo mv /etc/apt/sources.list.d/problem-repo.list /etc/apt/sources.list.d/problem-repo.list.disabled

# Update without it
sudo apt update

# Re-enable later
sudo mv /etc/apt/sources.list.d/problem-repo.list.disabled /etc/apt/sources.list.d/problem-repo.list
```

## Persistent Issues: Checking APT Configuration

Some APT configurations can cause persistent checksum issues:

```bash
# Check all APT configuration
apt-config dump | grep -i "compress\|acquire"

# Check if compression type is an issue
# Try forcing a specific compression type
sudo apt -o Acquire::CompressionTypes::Order=gz update
```

Some older mirrors don't properly serve all compression formats, causing the downloaded file to not match the listed hash.

## Summary

Hash Sum Mismatch errors follow a clear escalation path:

1. Clear the cache with `sudo rm -rf /var/lib/apt/lists/*` and retry
2. Check for proxy interference and test with `Acquire::http::Proxy=DIRECT`
3. Switch to the official Ubuntu mirror temporarily
4. Check for IPv6 issues and try forcing IPv4
5. Verify disk health if the problem persists

In over 90% of cases, clearing the cache resolves the issue. The remaining cases usually point to proxy or mirror synchronization problems that sort themselves out within a few hours.
