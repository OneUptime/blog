# How to Check Livepatch Status and Applied Patches on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Livepatch, Kernel, Security, Ubuntu Pro

Description: Learn how to check Livepatch status, view applied kernel patches, verify CVE coverage, and interpret livepatch output on Ubuntu servers running Ubuntu Pro.

---

Once Livepatch is enabled on your Ubuntu servers, you need to know how to verify it is working, understand what patches have been applied, and interpret the output of the status commands. This matters both for day-to-day operations and for compliance reporting - being able to prove that a specific CVE is mitigated without a reboot is valuable documentation.

## The canonical-livepatch Status Commands

The primary tool for checking Livepatch status is the `canonical-livepatch` command:

```bash
# Basic status - quick overview
sudo canonical-livepatch status

# Full verbose output with patch details
sudo canonical-livepatch status --verbose

# Machine-readable JSON output (good for scripting)
sudo canonical-livepatch status --format json
```

## Interpreting Status Output

```bash
sudo canonical-livepatch status --verbose
```

A healthy system shows:

```
Machine ID:  a1b2c3d4e5f6...
Machine token: [redacted]
Status: active
Tier:    updates

Kernel: 5.15.0-91-generic
Fully patched: true
Version: 102.1

Patches:
  CVE-2024-1086 (kpatch-5.15.0-91-generic__4-2): Applied
  CVE-2024-0646 (kpatch-5.15.0-91-generic__4-2): Applied
  CVE-2023-6931 (kpatch-5.15.0-91-generic__4-2): Applied
```

Key fields explained:

- **Status: active** - The daemon is running and communicating with Canonical's servers
- **Tier: updates** - You are receiving patches when released (not beta, not stable-only)
- **Kernel** - The running kernel version. Must match a supported version.
- **Fully patched: true** - All available patches for this kernel are applied
- **Version** - The livepatch package version installed
- **Patches** - Each CVE addressed and its application status

### Status Values

- **active** - Working normally
- **failed** - Something went wrong with patching
- **disabled** - Livepatch is not running
- **unknown** - Cannot determine status (connectivity issue, etc.)

### Patch Status Values

- **Applied** - Patch is active in the running kernel
- **NotApplied** - Available but not yet applied (may indicate an issue)
- **Inapplicable** - Not relevant to this kernel version
- **Waiting** - Queued but not yet applied

## Checking via Ubuntu Pro

```bash
# Ubuntu Pro also shows livepatch status
pro status

# More detail
pro status --all | grep -A5 livepatch
```

## Checking for Specific CVEs

When a CVE is disclosed and you need to verify your systems are protected:

```bash
# View all patches and search for a specific CVE
sudo canonical-livepatch status --verbose | grep CVE-2024-XXXX

# Or in JSON format for reliable parsing
sudo canonical-livepatch status --format json | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
status = data.get('status', [])
for kernel_status in status:
    patches = kernel_status.get('LivePatch', {}).get('patches', [])
    for patch in patches:
        if 'CVE-2024-XXXX' in patch.get('bugs', []):
            print(f\"Patch: {patch['name']}, Status: {patch['patched']}\")
"
```

## JSON Output for Scripting

The JSON format is the most reliable for automation:

```bash
# Get full JSON status
sudo canonical-livepatch status --format json | python3 -m json.tool

# Extract key information
sudo canonical-livepatch status --format json | python3 -c "
import json, sys

data = json.load(sys.stdin)

# Top-level machine info
print(f\"Machine ID: {data.get('machine-id', 'unknown')}\")

# Status for each kernel (usually just one)
for kernel_info in data.get('status', []):
    lp = kernel_info.get('LivePatch', {})
    print(f\"Kernel: {kernel_info.get('kernel', 'unknown')}\")
    print(f\"Running: {kernel_info.get('running', False)}\")
    print(f\"Status: {lp.get('state', 'unknown')}\")
    print(f\"Version: {lp.get('version', 'unknown')}\")

    patches = lp.get('patches', [])
    print(f\"Patches applied: {len([p for p in patches if p.get('patched')])}\")
    print(f\"Patches total: {len(patches)}\")
"
```

## Automated Status Monitoring Script

```bash
#!/bin/bash
# livepatch_check.sh - Check and report livepatch status
# Exit codes: 0=OK, 1=Warning, 2=Critical

check_livepatch() {
    # Check if canonical-livepatch is installed
    if ! command -v canonical-livepatch &>/dev/null; then
        echo "CRITICAL: canonical-livepatch not installed"
        return 2
    fi

    # Get JSON status
    local status_json
    if ! status_json=$(sudo canonical-livepatch status --format json 2>&1); then
        echo "CRITICAL: Cannot get livepatch status: $status_json"
        return 2
    fi

    # Parse key fields
    local fully_patched
    fully_patched=$(echo "$status_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for ks in data.get('status', []):
    if ks.get('running', False):
        lp = ks.get('LivePatch', {})
        patches = lp.get('patches', [])
        if all(p.get('patched', False) for p in patches if p.get('name')):
            print('true')
        else:
            print('false')
        break
" 2>/dev/null)

    local lp_state
    lp_state=$(echo "$status_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for ks in data.get('status', []):
    if ks.get('running', False):
        print(ks.get('LivePatch', {}).get('state', 'unknown'))
        break
" 2>/dev/null)

    if [ "$lp_state" = "applied" ] || [ "$fully_patched" = "true" ]; then
        local patch_count
        patch_count=$(echo "$status_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for ks in data.get('status', []):
    if ks.get('running', False):
        patches = ks.get('LivePatch', {}).get('patches', [])
        print(len([p for p in patches if p.get('patched')]))
        break
" 2>/dev/null)
        echo "OK: Livepatch active, $patch_count patches applied"
        return 0
    elif [ "$lp_state" = "nothing-to-apply" ]; then
        echo "OK: Livepatch active, no patches needed for this kernel"
        return 0
    else
        echo "WARNING: Livepatch state is '$lp_state'"
        return 1
    fi
}

check_livepatch
exit $?
```

## Viewing Livepatch History

```bash
# Livepatch check-in history is logged
sudo journalctl -u canonical-livepatchd --since "7 days ago" | \
    grep -E "Applied|patch|CVE"

# View the livepatch daemon logs
sudo journalctl -u canonical-livepatchd -n 100 --no-pager
```

## When "Fully patched: false"

If the system reports `Fully patched: false`, investigate:

```bash
# Get details on which patches are not applied
sudo canonical-livepatch status --verbose | grep -v "Applied"

# Check for errors
sudo canonical-livepatch status --verbose | grep -i "error\|fail"

# Restart the daemon to trigger a re-check
sudo systemctl restart canonical-livepatchd

# Wait a minute then check again
sleep 60
sudo canonical-livepatch status
```

Common causes:
- Unsupported kernel version (update the kernel and reboot)
- The daemon has not synced recently (check network connectivity)
- A patch failed to apply (check daemon logs)

## Compliance Reporting

For compliance documentation, capture livepatch status as evidence:

```bash
#!/bin/bash
# generate_livepatch_report.sh - Generate compliance evidence

OUTPUT_FILE="/var/reports/livepatch_$(hostname)_$(date +%Y%m%d).txt"
mkdir -p /var/reports

{
    echo "=== Ubuntu Livepatch Compliance Report ==="
    echo "Date: $(date -u)"
    echo "Hostname: $(hostname -f)"
    echo "Kernel: $(uname -r)"
    echo ""
    echo "=== Livepatch Status ==="
    canonical-livepatch status --verbose
    echo ""
    echo "=== Ubuntu Pro Status ==="
    pro status
    echo ""
    echo "=== Kernel Package Status ==="
    dpkg -l 'linux-image-*' | grep "^ii"
} > "$OUTPUT_FILE"

echo "Report saved: $OUTPUT_FILE"
```

Livepatch is most valuable when you treat it as a first line of defense - apply the livepatch immediately when a CVE drops, then schedule the full kernel update and reboot for the next maintenance window. The combination of immediate protection with planned maintenance gives you both security and stability.
