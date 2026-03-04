# How to Build and Execute Remediation Playbooks with Red Hat Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Remediation, Ansible, Automation, Linux

Description: Learn how to create and run Ansible remediation playbooks from Red Hat Insights to fix security vulnerabilities, compliance issues, and configuration risks across your RHEL systems.

---

Red Hat Insights can generate Ansible playbooks that automatically fix issues it detects. Instead of manually resolving each recommendation, you can select multiple findings across multiple systems and produce a single remediation playbook.

## How Remediation Works

When Insights identifies issues (vulnerabilities, advisor recommendations, or compliance failures), each finding includes a remediation definition. You can bundle these into a remediation plan, which generates an Ansible playbook.

## Create a Remediation Plan

1. Navigate to any Insights service (Advisor, Vulnerability, or Compliance)
2. Select one or more recommendations or CVEs
3. Click "Remediate"
4. Choose "Create a new playbook" or add to an existing one
5. Name the playbook (e.g., "March 2026 Security Fixes")
6. Select the affected systems
7. Click "Save"

## View and Download Remediation Playbooks

Navigate to https://console.redhat.com/insights/remediations to see all your remediation plans.

```bash
# You can also list remediations using the Insights API
curl -s -H "Authorization: Bearer $TOKEN" \
  https://console.redhat.com/api/remediations/v1/remediations | \
  python3 -m json.tool
```

## Download and Execute a Playbook

```bash
# Download the playbook from the Insights console
# The downloaded file is a standard Ansible playbook

# Review the playbook contents before running
cat insights-remediation.yml

# Execute the playbook against your systems
ansible-playbook -i inventory.ini insights-remediation.yml --become

# Example playbook structure:
# ---
# - name: Remediate CVE-2024-1234 on affected hosts
#   hosts: all
#   become: true
#   tasks:
#     - name: Update vulnerable openssl package
#       dnf:
#         name: openssl
#         state: latest
```

## Execute Remediations Directly via Cloud Connector

If your systems have Cloud Connector (rhc) configured, you can run playbooks directly from the Insights console without downloading them.

```bash
# Install and enable the remote host configuration daemon
sudo dnf install -y rhc
sudo rhc connect

# Verify the connection
sudo rhc status
```

Once connected, click "Execute playbook" in the Remediations console. The playbook runs on the target systems and results appear in the console.

## Track Remediation Progress

After execution, Insights tracks the status of each remediation:

- **Pending** - Not yet executed
- **Running** - Currently being applied
- **Success** - All tasks completed without error
- **Failure** - One or more tasks failed

## Verify Fixes

```bash
# Run insights-client again to re-scan the system
sudo insights-client

# Check that previously flagged issues are resolved in the console
```

The combination of detection and automated remediation makes Insights a powerful tool for maintaining a secure and compliant RHEL environment at scale.
