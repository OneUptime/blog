# How to Use wget with IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wget, HTTP, File Download, Network Diagnostics, Linux

Description: Use wget to download files and test HTTP services over IPv6, force IPv6 connections, and handle IPv6 addresses in URLs for scripted downloads.

## Introduction

`wget` supports IPv6 for HTTP, HTTPS, and FTP downloads. Like curl, IPv6 addresses in URLs require square brackets. The `--inet6-only` or `-6` flag forces IPv6 connections. wget is commonly used in scripts for file downloads and web service testing, making IPv6 support important for modern infrastructure.

## Basic IPv6 wget Commands

```bash
# Download from an IPv6 address

wget http://[2001:db8::1]/file.tar.gz

# Download from IPv6 HTTPS
wget https://[2001:db8::1]/file.tar.gz

# Force IPv6 for a hostname
wget --inet6-only https://example.com/file.tar.gz
# or shorthand:
wget -6 https://example.com/file.tar.gz

# Force IPv4 for comparison
wget --inet4-only https://example.com/file.tar.gz

# Check HTTP headers over IPv6
wget --server-response --spider -6 https://example.com/ 2>&1 | head -20
```

## Testing IPv6 Connectivity with wget

```bash
# Test if IPv6 connectivity works (spider = don't download)
wget --spider -6 https://ipv6.google.com 2>&1

# Download to stdout and discard (for testing)
wget -q -O /dev/null -6 https://example.com/
echo "Exit code: $?"

# Check response time
time wget -q -O /dev/null -6 https://example.com/

# Test IPv6 with custom DNS resolver (header override)
wget --header="Host: example.com" https://[2001:db8::1]/
```

## Downloading via IPv6 with Progress

```bash
# Download with progress bar over IPv6
wget -6 --progress=bar https://example.com/largefile.iso

# Download to specific directory
wget -6 -P /tmp/downloads/ https://example.com/file.tar.gz

# Resume interrupted IPv6 download
wget -6 -c https://example.com/largefile.iso

# Download multiple files over IPv6
wget -6 -i /tmp/urls.txt  # file with one URL per line
```

## Recursive Download Over IPv6

```bash
# Mirror a website over IPv6
wget -6 -r -l 2 https://example.com/docs/

# Download entire site for offline viewing
wget -6 --mirror --convert-links --no-parent \
    https://example.com/

# Download only specific file types
wget -6 -r -A "*.pdf,*.md" https://example.com/docs/
```

## IPv6 wget in Scripts

```bash
#!/bin/bash
# ipv6-download-test.sh

test_url() {
    local url="$1"
    local result

    # Test IPv6
    result=$(wget --inet6-only -q -O /dev/null \
        --server-response "$url" 2>&1 | grep "HTTP/" | tail -1)

    if [ -n "$result" ]; then
        echo "[IPv6 OK] $url: $result"
    else
        echo "[IPv6 FAIL] $url: No response"
    fi

    # Test IPv4 for comparison
    result=$(wget --inet4-only -q -O /dev/null \
        --server-response "$url" 2>&1 | grep "HTTP/" | tail -1)

    if [ -n "$result" ]; then
        echo "[IPv4 OK] $url: $result"
    else
        echo "[IPv4 FAIL] $url: No response"
    fi
}

test_url "https://ipv6.google.com/"
test_url "https://www.cloudflare.com/"
test_url "https://example.com/"
```

## wget Configuration for IPv6

```ini
# ~/.wgetrc - set IPv6 preference globally
prefer-family = IPv6

# Or force IPv6 always
#inet6-only = on

# Increase timeout for IPv6 (some networks have higher latency)
timeout = 30
```

## wget vs curl for IPv6

| Feature | wget | curl |
|---------|------|------|
| Force IPv6 flag | `--inet6-only` or `-6` | `-6` |
| URL format | `http://[::1]/path` | `http://[::1]/path` |
| DNS override | Not built-in | `--resolve host:port:addr` |
| Progress bar | Yes (default) | `-#` flag |
| Follow redirects | Yes (default) | `-L` flag |
| Spider mode | `--spider` | `-I` (HEAD only) |

## Conclusion

`wget -6` or `wget --inet6-only` forces IPv6 for downloads, useful when testing IPv6 connectivity or ensuring infrastructure uses IPv6. For IPv6 address URLs, use brackets (`http://[2001:db8::1]/`). The `--spider` flag tests connectivity without downloading, and `--server-response` shows HTTP headers for debugging. For complex IPv6 testing scenarios, `curl` with `--resolve` provides more control.
