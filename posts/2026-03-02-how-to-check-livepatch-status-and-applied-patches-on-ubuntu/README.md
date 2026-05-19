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

```text
last check: 52 seconds ago
kernel: 5.4.0-216.236-generic
server check-in: succeeded
kernel state: ✓ kernel series 5.4 is covered by Livepatch
patch state: ✓ all applicable livepatch kernel modules applied
patch version: 113.1
tier: updates (Free usage; This machine beta tests new patches.)
machine id: a1b2c3d4e5f6...

Applied CVEs:
  CVE-2024-1086
  CVE-2024-0646
  CVE-2023-6931
```

Key fields explained:

- **server check-in: succeeded** - The client was able to contact Canonical's Livepatch service
- **kernel state** - Whether the running kernel is covered by Livepatch. Unsupported or expired kernels need a kernel update and reboot.
- **patch state** - Whether Livepatch has applied all applicable livepatch modules, is applying them, has none available for this kernel, or has hit an error.
- **patch version** - The applied Livepatch Security Notice (LSN) version. For example, `113.1` maps to `LSN-0113-1`.
- **tier** - The Livepatch rollout tier. Canonical documents `updates` for free Ubuntu Pro users and `stable` for paid Ubuntu Pro users.
- **Applied CVEs** - CVEs addressed by the applied livepatch modules, shown in verbose output when applicable.

### Kernel State Values

- **kernel series ... is covered by Livepatch** - The running kernel series is covered
- **kernel ... is covered by Livepatch until ...** - The specific kernel is covered until the listed SRU coverage date
- **kernel is not covered by Livepatch** - The running kernel is not covered
- **kernel is no longer covered by Livepatch** - The running kernel has aged out of Livepatch coverage

### Patch State Values

- **all applicable livepatch kernel modules applied** - All available livepatch modules for this kernel are active
- **no livepatches available for kernel ...** - No livepatch exists yet for this kernel
- **patching the kernel** - A patch is currently being applied
- **livepatches are downloaded, but the kernel module is not yet inserted** - A patch is downloaded but not fully inserted
- **kernel ... contains a vulnerability that cannot be livepatched** - A kernel update and reboot are required
- **unknown error occurred** - Check the Livepatch daemon logs for details

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

# Or in JSON format for machine-readable output
sudo canonical-livepatch status --verbose --format json | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)

def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

for item in walk(data):
    if any('CVE-2024-XXXX' in str(v) for v in item.values()):
        print(item)
"
```

## JSON Output for Scripting

The JSON format is the best option for automation, but inspect the output from your installed client before depending on a particular field name:

```bash
# Get full JSON status
sudo canonical-livepatch status --verbose --format json | python3 -m json.tool

# Extract key information
sudo canonical-livepatch status --verbose --format json | python3 -c "
import json, sys

data = json.load(sys.stdin)

def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

records = list(walk(data))

machine_id = data.get('machine-id') or data.get('Machine-Id') or data.get('machine id') or 'unknown'
kernel = next((r.get('kernel') or r.get('Kernel') for r in records if r.get('kernel') or r.get('Kernel')), 'unknown')
patch_state = next((r.get('patchState') or r.get('State') for r in records if r.get('patchState') or r.get('State')), 'unknown')
patch_version = next((r.get('version') or r.get('Version') or r.get('Livepatch-Version') for r in records if r.get('version') or r.get('Version') or r.get('Livepatch-Version')), 'unknown')

print(f\"Machine ID: {machine_id}\")
print(f\"Kernel: {kernel}\")
print(f\"Patch state: {patch_state}\")
print(f\"Patch version: {patch_version}\")
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
    if ! status_json=$(sudo canonical-livepatch status --verbose --format json 2>&1); then
        echo "CRITICAL: Cannot get livepatch status: $status_json"
        return 2
    fi

    # Parse key fields
    local lp_state
    lp_state=$(echo "$status_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)

def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

for item in walk(data):
    state = item.get('patchState') or item.get('State')
    if state:
        print(state)
        break
" 2>/dev/null)

    local patch_version
    patch_version=$(echo "$status_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)

def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

for item in walk(data):
    version = item.get('version') or item.get('Version') or item.get('Livepatch-Version')
    if version:
        print(version)
        break
" 2>/dev/null)

    if [ "$lp_state" = "applied" ]; then
        echo "OK: Livepatch active, patch version ${patch_version:-unknown} applied"
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
sudo journalctl -u snap.canonical-livepatch.canonical-livepatchd --since "7 days ago" | \
    grep -E "Applied|patch|CVE"

# View the livepatch daemon logs
sudo journalctl -u snap.canonical-livepatch.canonical-livepatchd -n 100 --no-pager
```

## When Patch State Is Not Healthy

If the system reports a failing `patch state`, investigate:

```bash
# Get details on which patches are not applied
sudo canonical-livepatch status --verbose | grep -i "patch state\|CVE\|LSN"

# Check for errors
sudo canonical-livepatch status --verbose | grep -i "error\|fail"

# Restart the daemon to trigger a re-check
sudo systemctl restart snap.canonical-livepatch.canonical-livepatchd

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
