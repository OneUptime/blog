# How to Use the wget Command for Downloading Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Wget, Networking, Shell

Description: Learn how to use wget on Ubuntu for downloading files, resuming interrupted downloads, mirroring websites, recursive downloads, and scripting file retrieval workflows.

---

`wget` is Ubuntu's built-in non-interactive file downloader. Where `curl` is better suited for API interactions and scripting HTTP requests, `wget` excels at downloading files - it handles resuming interrupted downloads, recursive website mirroring, and batch downloading from a list of URLs. It's been part of GNU and ships on virtually every Linux system.

## Basic Downloads

```bash
# Download a file to the current directory (keeps original filename)
wget https://example.com/file.tar.gz

# Download with a custom output filename
wget -O output.tar.gz https://example.com/file.tar.gz

# Download to a specific directory
wget -P /tmp/downloads https://example.com/file.tar.gz

# Download quietly (suppress progress output)
wget -q https://example.com/file.tar.gz

# Download without showing any output but show errors
wget -q --show-progress https://example.com/large-file.tar.gz
```

## Resuming Interrupted Downloads

One of wget's strongest features is resuming partially downloaded files:

```bash
# Resume a download that was interrupted
wget -c https://example.com/large-file.iso

# Resume is safe to run even if the file doesn't exist yet
# If the file doesn't exist, it starts fresh
# If it was partially downloaded, it continues from where it left off

# In a script: always use -c for large files
wget -c https://releases.ubuntu.com/22.04/ubuntu-22.04-desktop-amd64.iso
```

## Retry on Failure

```bash
# Retry up to 3 times (default is 20 retries)
wget --tries=3 https://example.com/file.tar.gz

# Retry indefinitely (useful for files that must be downloaded)
wget --tries=0 https://example.com/file.tar.gz

# Wait 10 seconds between retries
wget --wait=10 --tries=5 https://example.com/file.tar.gz

# Combine: retry 5 times, wait 30 seconds between attempts
wget --tries=5 --waitretry=30 https://example.com/large-file.tar.gz
```

## Limiting Download Speed

Avoid saturating your network connection when downloading in the background:

```bash
# Limit to 1MB/s
wget --limit-rate=1m https://example.com/file.iso

# Limit to 500KB/s
wget --limit-rate=500k https://example.com/file.tar.gz

# In a script: background download with rate limiting
wget -c --limit-rate=2m -b -o /var/log/wget-download.log \
    https://example.com/large-file.iso

# Check background download progress
tail -f /var/log/wget-download.log
```

The `-b` flag runs wget in the background. It writes progress to a log file instead of the terminal.

## Downloading Multiple Files

```bash
# Download a list of URLs from a file (one URL per line)
cat > /tmp/urls.txt << 'EOF'
https://example.com/file1.tar.gz
https://example.com/file2.tar.gz
https://example.com/file3.tar.gz
EOF

wget -i /tmp/urls.txt

# Download to a specific directory
wget -P /tmp/downloads/ -i /tmp/urls.txt

# Download list with resume capability
wget -c -i /tmp/urls.txt
```

## Following Redirects and Authentication

```bash
# wget follows redirects by default (up to 20 hops)
wget https://bit.ly/some-short-url

# Limit redirect follows
wget --max-redirect=5 https://example.com/redirect

# HTTP Basic authentication
wget --user=username --password=password \
    https://protected.example.com/file.tar.gz

# Prompt for password (more secure than command line)
wget --user=username --ask-password \
    https://protected.example.com/file.tar.gz

# Authentication via .netrc file
# ~/.netrc: machine example.com login user password pass
wget --netrc https://protected.example.com/file.tar.gz
```

## Custom Headers and User Agent

```bash
# Set a custom User-Agent
wget --user-agent="MyDownloader/1.0" https://example.com/file.tar.gz

# Pretend to be a browser (for servers that block default wget UA)
wget --user-agent="Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/109.0" \
    https://example.com/file.tar.gz

# Add a custom header
wget --header="Authorization: Bearer mytoken" \
    https://api.example.com/export.csv

# Add referer header
wget --referer="https://example.com/downloads" \
    https://example.com/protected/file.tar.gz
```

## Recursive Downloading

wget can download entire website sections recursively:

```bash
# Download a website recursively (use carefully - this can download a lot)
wget -r https://example.com/docs/

# Recursive with depth limit
wget -r --level=2 https://example.com/docs/

# Download only specific file types
wget -r -A "*.pdf,*.png" https://example.com/docs/

# Exclude specific file types
wget -r -R "*.mp4,*.mov" https://example.com/

# Stay within the same domain (don't follow external links)
wget -r --no-parent https://example.com/docs/

# Convert links for local viewing (useful for offline documentation)
wget -r -k -p https://docs.example.com/
```

The `-k` flag converts links so locally saved pages link to each other rather than the remote server. Combined with `-p` (download page requisites like CSS and images), this creates a locally viewable copy.

## Mirror a Website

```bash
# Complete mirror of a site (recursive, follow links, keep timestamps)
wget --mirror --convert-links --adjust-extension \
    --page-requisites --no-parent \
    https://example.com/

# Equivalent shorter form
wget -m -k -E -p --no-parent https://example.com/
```

Options explained:
- `-m` / `--mirror`: enables recursive, infinite depth, timestamps
- `-k` / `--convert-links`: convert links for local browsing
- `-E` / `--adjust-extension`: add `.html` extension when needed
- `-p` / `--page-requisites`: download CSS, images, JS needed to display pages
- `--no-parent`: don't follow links to parent directories

## SSL/TLS Options

```bash
# Disable SSL certificate verification (insecure - only for testing)
wget --no-check-certificate https://self-signed.example.com/file.tar.gz

# Specify a CA certificate
wget --ca-certificate=/path/to/ca.crt https://internal.example.com/file.tar.gz

# Use TLS 1.2 minimum
wget --secure-protocol=TLSv1_2 https://example.com/file.tar.gz
```

## Practical Script: Downloading and Verifying Files

```bash
#!/bin/bash
# download-and-verify.sh - Download a file and verify its checksum

set -euo pipefail

download_and_verify() {
    local url="$1"
    local expected_sha256="$2"
    local output_file="${3:-$(basename "$url")}"

    echo "Downloading: $url"

    # Download with resume capability
    wget -c --progress=bar:force \
        -O "$output_file" \
        "$url" 2>&1

    echo "Verifying checksum..."

    # Calculate actual checksum
    actual_sha256=$(sha256sum "$output_file" | awk '{print $1}')

    if [ "$actual_sha256" = "$expected_sha256" ]; then
        echo "Checksum verified: $output_file"
        return 0
    else
        echo "ERROR: Checksum mismatch!" >&2
        echo "  Expected: $expected_sha256" >&2
        echo "  Actual:   $actual_sha256" >&2
        rm -f "$output_file"
        return 1
    fi
}

# Example usage - download and verify a release
UBUNTU_ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso"
UBUNTU_SHA256="f7fde38d6745c12ef37b9aaaaa6a7a42cc35b19eae3a9e8e5f3dca07bbc0d9c8"  # example only

download_and_verify "$UBUNTU_ISO_URL" "$UBUNTU_SHA256" "/tmp/ubuntu-22.04.iso"
```

## Timestamping: Download Only If Changed

```bash
# Only download if the server's file is newer than the local copy
wget -N https://example.com/config.tar.gz

# This is useful for scheduled tasks that sync files:
# If the file hasn't changed on the server, wget won't download again
```

## Logging and Output Control

```bash
# Log all output to a file
wget -o /var/log/wget.log https://example.com/file.tar.gz

# Append to existing log file
wget -a /var/log/wget.log https://example.com/file.tar.gz

# Show only errors
wget -q https://example.com/file.tar.gz

# Verbose (shows request and response details)
wget -d https://example.com/file.tar.gz

# Server response (show headers)
wget --server-response https://example.com/
```

## wget Configuration File

Default settings go in `~/.wgetrc`:

```bash
# ~/.wgetrc
# Always resume incomplete downloads
continue = on

# Retry 5 times
tries = 5

# Wait 10 seconds between retries
waitretry = 10

# Limit rate to 5MB/s
limit_rate = 5m

# Timeout after 30 seconds
timeout = 30

# No verbose output by default
quiet = on
```

## Scripting Download Workflows

```bash
#!/bin/bash
# sync-assets.sh - Download/update a collection of asset files

ASSETS_DIR="/var/www/assets"
BASE_URL="https://cdn.example.com/assets"
MANIFEST_URL="${BASE_URL}/manifest.txt"

mkdir -p "$ASSETS_DIR"

echo "Fetching asset manifest..."
wget -q -O /tmp/manifest.txt "$MANIFEST_URL"

# Process manifest - each line is: filename sha256
while IFS=' ' read -r filename expected_hash; do
    [ -z "$filename" ] && continue
    [[ "$filename" =~ ^# ]] && continue

    local_file="$ASSETS_DIR/$filename"
    asset_url="$BASE_URL/$filename"

    # Check if file exists and has correct hash
    if [ -f "$local_file" ]; then
        actual_hash=$(sha256sum "$local_file" | awk '{print $1}')
        if [ "$actual_hash" = "$expected_hash" ]; then
            echo "Up to date: $filename"
            continue
        else
            echo "Hash mismatch, re-downloading: $filename"
        fi
    fi

    echo "Downloading: $filename"
    wget -q -c -O "$local_file" "$asset_url" || {
        echo "Failed to download: $filename" >&2
        rm -f "$local_file"
    }
done < /tmp/manifest.txt

echo "Asset sync complete"
```

The choice between `wget` and `curl` comes down to the use case: wget for downloading files (especially large ones that might need resuming or batch downloading), and curl for API interactions, custom request methods, and scripting HTTP workflows. Both are valuable to have in your toolkit.
