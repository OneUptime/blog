# How to Implement a Patch Management Strategy for RHEL Fleets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Patching, Security, Fleet Management, Linux

Description: Design and implement a patch management strategy for fleets of RHEL servers using dnf-automatic, content views, and staged rollouts.

---

Managing patches across dozens or hundreds of RHEL servers requires a structured approach. Random patching leads to inconsistencies and unexpected breakages. Here is how to build a reliable patch management strategy.

## Patch Classification

RHEL classifies updates into three categories. Prioritize accordingly:

```bash
# View available updates by type
sudo dnf updateinfo summary

# List only security updates
sudo dnf updateinfo list security

# List only critical/important security updates
sudo dnf updateinfo list --security --severity Critical
sudo dnf updateinfo list --security --severity Important
```

## Staged Rollout Strategy

Apply patches in stages to catch issues before they reach production:

```bash
Stage 1: Development servers (Day 1)
Stage 2: Staging/QA servers (Day 3)
Stage 3: Production non-critical (Day 7)
Stage 4: Production critical (Day 14)
```

## Automated Patching with dnf-automatic

Configure dnf-automatic differently per server tier:

```bash
# Install dnf-automatic
sudo dnf install dnf-automatic

# For dev servers: auto-apply all updates
sudo tee /etc/dnf/automatic.conf << 'EOF'
[commands]
upgrade_type = default
apply_updates = yes
reboot = when-needed

[emitters]
emit_via = stdio,email

[email]
email_from = rhel-patches@example.com
email_to = ops-team@example.com
email_host = smtp.example.com
EOF

sudo systemctl enable --now dnf-automatic-install.timer
```

```bash
# For production servers: download only, notify, do not apply
sudo tee /etc/dnf/automatic.conf << 'EOF'
[commands]
upgrade_type = security
download_updates = yes
apply_updates = no

[emitters]
emit_via = email

[email]
email_from = rhel-patches@example.com
email_to = ops-team@example.com
email_host = smtp.example.com
EOF

sudo systemctl enable --now dnf-automatic-notifyonly.timer
```

## Snapshot Before Patching

On servers using LVM, create a snapshot before applying patches:

```bash
# Create an LVM snapshot before patching
sudo lvcreate -L 5G -s -n root-snap /dev/rhel/root

# Apply patches
sudo dnf update -y

# If something breaks, roll back
sudo lvconvert --merge /dev/rhel/root-snap
# Reboot to complete the merge
```

## Tracking Patch Compliance

Use dnf history to audit what was patched and when:

```bash
# View recent patching history
sudo dnf history list --reverse | tail -20

# Get details of a specific transaction
sudo dnf history info 42

# Check which advisories are still not applied
sudo dnf updateinfo list --available
```

## Fleet-Wide Patch Reporting

Create a simple script to report patch status across servers:

```bash
#!/bin/bash
# Run via SSH on each server in your fleet
echo "$(hostname): $(dnf updateinfo list --security --available 2>/dev/null | wc -l) security updates pending"
```

A well-executed patch strategy reduces risk while keeping your fleet secure and consistent.
