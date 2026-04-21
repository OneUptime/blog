# How to Test IPv6 Firewall Rules Without Locking Yourself Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Testing, Ip6tables, Safety

Description: Learn safe techniques for testing IPv6 firewall rules without risking loss of remote access, using safety timers, testing frameworks, and staged deployment.

## Overview

Incorrectly applied firewall rules can lock you out of a remote server permanently - especially dangerous for IPv6 where you might be relying on a specific global address for SSH access. This guide covers safe testing practices: scheduled auto-revert timers, rule testing tools, and staged deployment approaches.

## The Safety Timer Pattern

The most important technique: schedule a rule revert BEFORE applying changes:

```bash
#!/bin/bash
# ALWAYS run this before testing new firewall rules

# Schedule automatic revert in 5 minutes

JOB=$(LC_ALL=C at now + 5 minutes 2>&1 << 'EOF'
echo "SAFETY REVERT: Restoring firewall rules" | logger -t firewall
ip6tables -F
ip6tables -P INPUT ACCEPT
ip6tables -P FORWARD ACCEPT
ip6tables -P OUTPUT ACCEPT
ip6tables-restore < /etc/iptables/rules.v6.backup
EOF
)
JOB_ID=$(printf '%s\n' "$JOB" | awk '/^job / {print $2}')
if [ -z "$JOB_ID" ]; then
    echo "ERROR: failed to schedule safety timer:" >&2
    printf '%s\n' "$JOB" >&2
    exit 1
fi

echo "Safety timer set. You have 5 minutes to test."
echo "If access is maintained, cancel with: atrm ${JOB_ID}"
```

## Step-by-Step Safe Testing Process

### 1. Backup Current Working Rules

```bash
# Save current (known-good) rules
ip6tables-save > /etc/iptables/rules.v6.backup.$(date +%Y%m%d_%H%M%S)
# Keep last 5 backups
ls -t /etc/iptables/rules.v6.backup.* | tail -n +6 | xargs rm -f

echo "Backup saved"
```

### 2. Validate New Rules Syntax Before Applying

```bash
# Test syntax without applying
ip6tables-restore --test < /tmp/new-rules.v6
# Exit code 0 = valid, non-zero = syntax error

# nftables dry-run
nft -c -f /etc/nftables.d/new-rules.nft   # -c = check only, don't apply
```

### 3. Apply with Safety Timer

```bash
#!/bin/bash
# safe-apply-ip6tables.sh

BACKUP="/etc/iptables/rules.v6.backup"
NEW_RULES="/tmp/new-rules.v6"
REVERT_MINUTES=3

# Step 1: Backup
ip6tables-save > "$BACKUP"
echo "Backup saved to $BACKUP"

# Step 2: Validate
ip6tables-restore --test < "$NEW_RULES"
if [ $? -ne 0 ]; then
    echo "ERROR: New rules have syntax errors. Aborting."
    exit 1
fi

# Step 3: Schedule revert
JOB=$(LC_ALL=C at now + ${REVERT_MINUTES} minutes 2>&1 << EOF
ip6tables-restore < $BACKUP
echo "REVERTED at \$(date)" | logger -t firewall-revert
EOF
)
JOB_ID=$(printf '%s\n' "$JOB" | awk '/^job / {print $2}')
if [ -z "$JOB_ID" ]; then
    echo "ERROR: failed to schedule safety timer:" >&2
    printf '%s\n' "$JOB" >&2
    exit 1
fi
echo "Safety revert scheduled as job ${JOB_ID} (runs in ${REVERT_MINUTES} minutes)"

# Step 4: Apply new rules
ip6tables-restore < "$NEW_RULES"
echo "New rules applied."

# Step 5: Test access
echo "Testing SSH connectivity..."
# User should test from a different terminal

echo ""
echo "If everything works, cancel the revert: atrm ${JOB_ID}"
echo "If access is lost, wait ${REVERT_MINUTES} minutes for automatic revert"
```

## Testing Without a Second Connection

If you only have one SSH session:

```bash
# Method: Keep a safety timer, then run a local sanity check

apply_and_test() {
    local RULES_FILE="$1"
    local BACKUP="$2"
    local REVERT_MINUTES="${3:-3}"
    local JOB
    local JOB_ID

    JOB=$(LC_ALL=C at now + ${REVERT_MINUTES} minutes 2>&1 << EOF
ip6tables-restore < $BACKUP
echo "REVERTED at \$(date)" | logger -t firewall-revert
EOF
)
    JOB_ID=$(printf '%s\n' "$JOB" | awk '/^job / {print $2}')
    if [ -z "$JOB_ID" ]; then
        echo "ERROR: failed to schedule safety timer:" >&2
        printf '%s\n' "$JOB" >&2
        return 1
    fi

    # Apply new rules
    ip6tables-restore < "$RULES_FILE"

    # Test: can we do basic operations?
    # Check: are our own connections still established?
    if conntrack -L -f ipv6 2>/dev/null | grep -q "ESTABLISHED"; then
        echo "Conntrack shows established connections - weak local signal only"
        echo "Try a new SSH connection if possible; cancel revert with: atrm ${JOB_ID}"
        return 0
    else
        echo "WARNING: No established connections found - reverting"
        ip6tables-restore < "$BACKUP"
        atrm "$JOB_ID" 2>/dev/null
        return 1
    fi
}
```

## Testing Specific Rules Without Full Reapply

```bash
# Test an ADDITIONAL rule without rebuilding the whole ruleset

# Add a test rule
ip6tables -A INPUT -s 2001:db8:100::/48 -j ACCEPT

# Test (from a host in 2001:db8:100::/48)
# If it works, make it permanent

# Remove if test fails
ip6tables -D INPUT -s 2001:db8:100::/48 -j ACCEPT
```

## nftables Testing

```bash
# nftables atomic load - entire file loads or nothing does
nft -f /etc/nftables.conf
# If it fails, old rules remain

# Dry run check
nft -c -f /etc/nftables.conf
# Validates commands without applying anything

# Apply with automatic save-and-rollback
nft_safe_apply() {
    local FILE="$1"
    local BACKUP="/tmp/nft-backup.nft"
    local JOB
    local JOB_ID

    # Save current
    {
        echo "flush ruleset"
        nft list ruleset
    } > "$BACKUP"

    # Schedule revert
    JOB=$(LC_ALL=C at now + 3 minutes 2>&1 << EOF
nft -f "$BACKUP"
logger "REVERTED nftables to backup"
EOF
)
    JOB_ID=$(printf '%s\n' "$JOB" | awk '/^job / {print $2}')
    if [ -z "$JOB_ID" ]; then
        echo "ERROR: failed to schedule safety timer:" >&2
        printf '%s\n' "$JOB" >&2
        return 1
    fi

    # Apply
    nft -f "$FILE"
    echo "Applied. Revert in 3 minutes (job $JOB_ID)"
    echo "To keep: atrm $JOB_ID"
}

nft_safe_apply /etc/nftables.d/new-rules.nft
```

## Testing Checklist

After applying new rules, test from a separate terminal or second connection:

```bash
# 1. SSH still works
ssh admin@your-server.example.com

# 2. IPv6 ping still works
ping6 -c 3 your-server.example.com

# 3. Web services still accessible
curl -6 https://your-server.example.com

# 4. ICMPv6 Packet Too Big still passes
# (Test with large pings)
ping6 -c 3 -s 1450 your-server.example.com

# 5. Traceroute6 works (tests Time Exceeded)
traceroute6 your-server.example.com

# 6. Log inspection - no unexpected drops
journalctl -k | grep "ip6" | tail -20
```

## Emergency Recovery

If you do lose access:

```bash
# If you have console/out-of-band access (IPMI, KVM, cloud console):
ip6tables -F
ip6tables -P INPUT ACCEPT

# Or via IPv4 (if available as fallback):
ssh -4 admin@ipv4.your-server.example.com
# Then fix IPv6 firewall rules
```

## Summary

Safe IPv6 firewall testing requires: (1) always backup current rules before changes, (2) validate syntax with `ip6tables-restore --test` or `nft -c -f`, (3) schedule an auto-revert timer with `at now + 5 minutes` before applying, (4) apply rules and immediately test from a second terminal, (5) cancel the auto-revert timer only after confirming access is intact. For nftables, the atomic load (`nft -f file`) means the entire ruleset either succeeds or fails, reducing partial-application risk. Never test from your only connection without a safety revert timer.
