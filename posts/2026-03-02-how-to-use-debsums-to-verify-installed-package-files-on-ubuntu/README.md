# How to Use debsums to Verify Installed Package Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Package Management, debsums, Integrity

Description: Use debsums on Ubuntu to verify MD5 checksums of installed package files, detect modifications, and identify potentially compromised system files.

---

After a system compromise, or even just to audit system integrity after a messy manual intervention, you need a way to verify that installed package files match what the package maintainer shipped. `debsums` does this by comparing the MD5 checksums of installed files against the checksums stored in the package's metadata. Files that do not match the recorded checksum may have been modified - intentionally by an admin, accidentally, or maliciously.

## Installing debsums

```bash
sudo apt update
sudo apt install debsums
```

## Basic Usage

```bash
# Verify all installed packages
sudo debsums

# Verify a specific package
sudo debsums nginx

# Verify multiple packages
sudo debsums nginx openssl bash
```

The output shows the status of each file:

```
/usr/sbin/nginx                    OK
/etc/nginx/nginx.conf              REPLACED  (config file, expected to be modified)
/usr/share/man/man8/nginx.8.gz     OK
```

Files marked `REPLACED` are configuration files that have been modified - this is expected behavior. Files marked `FAILED` have checksums that do not match the package's recorded checksums.

## Checking Only Failed Files

```bash
# Show only files that fail checksum verification
sudo debsums -s

# Short form - only show failures
sudo debsums --silent

# Or pipe and grep
sudo debsums 2>&1 | grep -v "^OK\|REPLACED"
```

## Verifying Security-Critical Packages

For a focused security audit, start with the most critical components.

```bash
# Verify core utilities
sudo debsums coreutils bash dash

# Verify authentication components
sudo debsums passwd login sudo shadow

# Verify SSH
sudo debsums openssh-server openssh-client

# Verify the package manager itself
sudo debsums dpkg apt

# Verify shared libraries
sudo debsums libc6 libssl3

# Verify the kernel (if package is installed)
sudo debsums linux-image-$(uname -r) 2>/dev/null || echo "No checksum data for kernel"
```

## Understanding What debsums Can and Cannot Check

Not all packages ship MD5 checksum files. debsums can only check packages that include a `md5sums` file in their data.

```bash
# List packages that DO have checksum data
sudo debsums -l

# List packages that do NOT have checksum data
sudo debsums -l 2>&1 | grep "missing"

# Or specifically list packages lacking md5sums
dpkg -l | awk '/^ii/{print $2}' | while read pkg; do
    if [ ! -f "/var/lib/dpkg/info/${pkg}.md5sums" ] && \
       [ ! -f "/var/lib/dpkg/info/${pkg}:amd64.md5sums" ]; then
        echo "No checksums: $pkg"
    fi
done
```

## Generating Missing Checksums

For packages that lack an `md5sums` file, you can generate one from the currently installed files. Note: this is only useful as a baseline for future checks, not for verifying the current state.

```bash
# Generate a checksum database for packages missing one
sudo debsums --generate=missing

# Or generate checksums for all packages (both existing and missing)
sudo debsums --generate=all

# This creates md5sums files in /var/lib/dpkg/info/
```

Be aware that generating checksums from an already-compromised system creates a corrupted baseline.

## Checking Against Downloaded Package Files

For more authoritative verification, download the original `.deb` file and compare against it directly.

```bash
# Download the package without installing (uses current sources)
sudo apt download nginx

# Compare installed files against the downloaded package
sudo debsums -p /path/to/downloaded/ nginx

# Or use dpkg-deb to extract and compare manually
dpkg-deb -x nginx_*.deb /tmp/nginx-extract/

# Compare a specific file
md5sum /usr/sbin/nginx
md5sum /tmp/nginx-extract/usr/sbin/nginx
```

## Integrating debsums into a Security Audit

Create a script that runs a comprehensive check and reports only concerning results.

```bash
#!/bin/bash
# security-audit.sh - Run debsums and report issues

CRITICAL_PACKAGES=(
    "bash" "dash" "coreutils" "util-linux"
    "passwd" "login" "sudo" "shadow"
    "openssh-server" "openssh-client"
    "dpkg" "apt" "apt-utils"
    "libc6" "libssl3"
    "systemd" "systemd-sysv"
)

echo "=== debsums Security Audit $(date) ==="
echo ""

echo "--- Checking critical system packages ---"
for pkg in "${CRITICAL_PACKAGES[@]}"; do
    result=$(sudo debsums -s "$pkg" 2>&1)
    if [ -n "$result" ]; then
        echo "ISSUE in $pkg:"
        echo "$result"
    else
        echo "OK: $pkg"
    fi
done

echo ""
echo "--- Running full system check for FAILED files ---"
# Show all failed files across all packages
sudo debsums -s 2>/dev/null
echo ""
echo "=== Audit complete ==="
```

## Combining debsums with AIDE or Tripwire

debsums is useful but limited to package-managed files. For comprehensive file integrity monitoring, combine it with a proper IDS (Intrusion Detection System).

```bash
# Install AIDE (Advanced Intrusion Detection Environment)
sudo apt install aide

# Initialize the AIDE database (after a known-good state)
sudo aideinit

# Run AIDE check against the baseline
sudo aide --check
```

AIDE monitors all files you configure it to watch, not just package-managed files. Use debsums for quick package verification and AIDE for ongoing monitoring.

## Reading the Checksum Data Directly

```bash
# View the raw checksum data for a package
cat /var/lib/dpkg/info/nginx.md5sums | head -20

# Compare a file's current checksum manually
pkg_checksum=$(grep "usr/sbin/nginx" /var/lib/dpkg/info/nginx.md5sums | awk '{print $1}')
current_checksum=$(md5sum /usr/sbin/nginx | awk '{print $1}')

echo "Package checksum: $pkg_checksum"
echo "Current checksum: $current_checksum"

if [ "$pkg_checksum" = "$current_checksum" ]; then
    echo "File matches package"
else
    echo "WARNING: File has been modified"
fi
```

## Dealing with Legitimate Modifications

Some modifications are intentional - configuration files get edited, binaries get patched. debsums marks these as failures too.

```bash
# Check which packages have failed files, then investigate
sudo debsums -s 2>/dev/null | while read line; do
    file=$(echo "$line" | awk '{print $1}')
    # Check if it is a config file (conffile)
    if dpkg -S "$file" 2>/dev/null | head -1; then
        pkg=$(dpkg -S "$file" 2>/dev/null | awk -F: '{print $1}')
        if grep -q "$file" /var/lib/dpkg/info/${pkg}.conffiles 2>/dev/null; then
            echo "Expected modification (conffile): $file"
        else
            echo "UNEXPECTED modification: $file"
        fi
    fi
done
```

## Automating Regular debsums Checks

```bash
# Create a cron job for weekly debsums checks
sudo tee /etc/cron.weekly/debsums-check << 'EOF'
#!/bin/bash
# Weekly debsums integrity check
REPORT=/var/log/debsums-report.log
echo "debsums check $(date)" >> "$REPORT"
sudo debsums -s 2>&1 >> "$REPORT"
echo "---" >> "$REPORT"

# Send email if there are failures (requires mail configured)
if sudo debsums -s 2>&1 | grep -q "FAILED"; then
    sudo debsums -s 2>&1 | mail -s "debsums failures on $(hostname)" root
fi
EOF
sudo chmod +x /etc/cron.weekly/debsums-check
```

debsums provides a quick first-pass integrity check that is particularly useful right after a suspicious event or before a compliance audit. It is not a replacement for a full HIDS, but it catches most cases of modified or replaced system binaries quickly.
