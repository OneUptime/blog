# How to Use the Ansible Lockdown RHEL9-CIS Role for Automated Hardening

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, CIS, Hardening, Security, Compliance

Description: Use the Ansible Lockdown RHEL9-CIS role to automatically apply CIS Benchmark security hardening to your RHEL 9 systems.

---

The CIS (Center for Internet Security) Benchmark provides detailed security configuration guidelines. The Ansible Lockdown project provides an Ansible role that automates applying these benchmarks to RHEL 9.

## Install the Role

```bash
# Install the role from Ansible Galaxy
ansible-galaxy install ansible-lockdown.rhel9_cis

# Or clone directly from GitHub
git clone https://github.com/ansible-lockdown/RHEL9-CIS.git roles/rhel9_cis
```

## Create the Playbook

```yaml
# harden.yml - Apply CIS Level 1 hardening to RHEL 9
---
- name: Apply CIS hardening to RHEL 9 servers
  hosts: all
  become: true
  vars:
    # CIS benchmark section toggles
    rhel9cis_section1: true  # Initial Setup
    rhel9cis_section2: true  # Services
    rhel9cis_section3: true  # Network Configuration
    rhel9cis_section4: true  # Logging and Auditing
    rhel9cis_section5: true  # Access, Authentication and Authorization
    rhel9cis_section6: true  # System Maintenance

    # Level selection (1 = Server Level 1, 2 = Server Level 2)
    rhel9cis_level_1: true
    rhel9cis_level_2: false

    # Customize specific controls
    # Disable specific rules that may break your environment
    rhel9cis_rule_1_1_1_1: true   # Disable cramfs
    rhel9cis_rule_1_1_1_2: true   # Disable squashfs

    # Set the warning banner
    rhel9cis_warning_banner: |
      Authorized users only. All activity is monitored.

    # Time synchronization
    rhel9cis_time_synchronization: chrony

  roles:
    - rhel9_cis
```

## Run in Check Mode First

```bash
# Dry run to see what would change
ansible-playbook -i inventory harden.yml --check --diff

# Review the output carefully before applying
```

## Apply the Hardening

```bash
# Apply the CIS hardening
ansible-playbook -i inventory harden.yml

# Run against a specific host
ansible-playbook -i inventory harden.yml --limit web01.example.com
```

## Selective Hardening

You can disable specific rules that conflict with your requirements:

```yaml
  vars:
    # Example: Skip the USB storage disable rule if you need USB
    rhel9cis_rule_1_1_1_7: false

    # Skip firewall configuration if managed elsewhere
    rhel9cis_rule_3_4_1_1: false

    # Skip SSH MaxAuthTries if you use key-based auth
    rhel9cis_rule_5_2_6: false
```

## Verify Hardening

After running the playbook, verify compliance:

```bash
# Run an OpenSCAP scan to verify compliance
sudo dnf install -y openscap-scanner scap-security-guide
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --report /tmp/cis-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

Always test CIS hardening in a non-production environment first. Some rules may break applications that depend on specific system configurations.
