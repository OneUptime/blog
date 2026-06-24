# How to Establish a Change Management Process for RHEL Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Change Management, Operation, Best Practice, Linux

Description: Set up a change management process for RHEL infrastructure using built-in tools for tracking, auditing, and rolling back system changes.

---

Untracked changes are the leading cause of production incidents. A change management process ensures that every modification to your RHEL servers is planned, documented, tested, and reversible.

## Tracking Package Changes

DNF keeps a full history of every package transaction:

```bash
# View the complete DNF transaction history

sudo dnf history list

# Get details of a specific transaction
sudo dnf history info 15

# Undo a supported transaction
sudo dnf history undo 15
```

## Tracking Configuration Changes with etckeeper

Use etckeeper to put /etc under version control:

```bash
# Install etckeeper
# Enable EPEL or an approved internal repository first if etckeeper is not in your enabled RHEL repositories.
sudo dnf install etckeeper git

# Initialize the repository
sudo etckeeper init
sudo etckeeper commit "Initial commit of /etc"

# After any change, check what was modified
sudo git -C /etc diff
sudo git -C /etc log --oneline -10
```

When installed with DNF integration, etckeeper hooks into DNF automatically, so package installs and updates trigger a commit.

## Pre-Change Checklist

Before making any change, gather this information:

```bash
#!/bin/bash
# pre-change-snapshot.sh
# Run before any planned change

CHANGE_ID=${1:-"CHANGE-$(date +%Y%m%d%H%M)"}
OUTDIR="/var/log/changes/${CHANGE_ID}"
mkdir -p "$OUTDIR"

# Record current system state
rpm -qa --queryformat '%{NAME}-%{VERSION}-%{RELEASE}\n' | sort > "$OUTDIR/packages.txt"
systemctl list-units --type=service --state=running > "$OUTDIR/services.txt"
ip addr show > "$OUTDIR/network.txt"
df -h > "$OUTDIR/disk.txt"
command -v firewall-cmd >/dev/null && sudo firewall-cmd --list-all-zones > "$OUTDIR/firewalld.txt" 2>/dev/null
command -v nft >/dev/null && sudo nft list ruleset > "$OUTDIR/nftables.txt" 2>/dev/null
command -v iptables-save >/dev/null && sudo iptables-save > "$OUTDIR/iptables.txt" 2>/dev/null
cat /etc/fstab > "$OUTDIR/fstab.txt"

echo "Pre-change snapshot saved to $OUTDIR"
```

## Post-Change Verification

After applying the change, verify the system is healthy:

```bash
#!/bin/bash
# post-change-verify.sh
CHANGE_ID=$1

echo "=== Post-Change Verification for $CHANGE_ID ==="

# Check for failed services
FAILED=$(systemctl --failed --no-legend | wc -l)
echo "Failed services: $FAILED"

# Check recent SELinux denials
echo "Recent SELinux denials:"
sudo ausearch -m AVC --start recent 2>/dev/null | head -5

# Compare package list
diff /var/log/changes/${CHANGE_ID}/packages.txt <(rpm -qa --queryformat '%{NAME}-%{VERSION}-%{RELEASE}\n' | sort)

# Verify disk space
df -h /
```

## Rollback Procedures

Always document how to roll back before making a change:

```bash
# Rollback a DNF transaction
# Note: DNF undo is not supported for downgrading core RHEL system packages.
sudo dnf history undo <transaction-id>

# Rollback a configuration change using etckeeper
sudo git -C /etc checkout -- /etc/httpd/conf/httpd.conf

# Rollback using an LVM snapshot (if created before the change)
sudo lvconvert --merge /dev/vg_root/pre-change-snap
sudo reboot
```

## Audit Trail

Configure auditd to log who makes changes:

```bash
# Track changes to critical configuration files
sudo tee /etc/audit/rules.d/change-mgmt.rules << 'EOF'
-w /etc/sysconfig/ -p wa -k sysconfig-change
-w /etc/httpd/ -p wa -k httpd-change
-w /etc/firewalld/ -p wa -k firewall-change
EOF

sudo augenrules --load

# Search audit logs for changes
sudo ausearch -k sysconfig-change --start today
```

A good change management process saves time during incident response because you always know what changed and when.
