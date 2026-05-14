# How to Use the Ansible Lockdown RHEL9-CIS Role for Automated Hardening

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, CIS, Hardening, Security, Compliance

Description: Use the Ansible Lockdown RHEL9-CIS role to automatically apply CIS Benchmark security hardening to your RHEL 9 systems.

---

The CIS (Center for Internet Security) Benchmark provides detailed security configuration guidelines. The Ansible Lockdown project provides an Ansible role that automates applying these benchmarks to RHEL 9.

## Install the Role

```bash
# Install the role from Ansible Galaxy

ansible-galaxy role install ansible-lockdown.rhel9_cis --roles-path roles

# Or clone directly from GitHub
git clone https://github.com/ansible-lockdown/RHEL9-CIS.git roles/ansible-lockdown.rhel9_cis
```

## Create the Playbook

```yaml
# harden.yml - Apply CIS hardening to RHEL 9
---
- name: Apply CIS hardening to RHEL 9 servers
  hosts: all
  become: true
  vars:
    # CIS benchmark section toggles
    rhel9cis_section1: true  # Initial Setup
    rhel9cis_section2: true  # Services
    rhel9cis_section3: true  # Network Configuration
    rhel9cis_section4: true  # Firewalls
    rhel9cis_section5: true  # Access, Authentication and Authorization
    rhel9cis_section6: true  # Logging and Auditing
    rhel9cis_section7: true  # System Maintenance

    # Audit level metadata; use playbook tags such as level1-server to limit remediation
    rhel9cis_level_1: true
    rhel9cis_level_2: false

    # Customize specific controls
    # Disable specific rules that may break your environment
    rhel9cis_rule_1_1_1_1: true   # Disable cramfs
    rhel9cis_rule_1_1_1_6: true   # Disable squashfs

    # Set the warning banner
    rhel9cis_warning_banner: |
      Authorized users only. All activity is monitored.

    # Time synchronization servers
    rhel9cis_time_synchronization_servers:
      - time.cloudflare.com
      - time.google.com

  roles:
    - ansible-lockdown.rhel9_cis
```

## Run in Check Mode First

```bash
# Dry run Level 1 Server controls to see what would change
ansible-playbook -i inventory harden.yml --tags level1-server --check --diff

# Review the output carefully before applying
```

## Apply the Hardening

```bash
# Apply the CIS Level 1 Server hardening
ansible-playbook -i inventory harden.yml --tags level1-server

# Run against a specific host
ansible-playbook -i inventory harden.yml --tags level1-server --limit web01.example.com
```

## Selective Hardening

You can disable specific rules that conflict with your requirements:

```yaml
  vars:
    # Example: Skip the USB storage disable rule if you need USB
    rhel9cis_rule_1_1_1_8: false

    # Skip firewall configuration if managed elsewhere
    rhel9cis_section4: false

    # Skip SSH MaxAuthTries if you use key-based auth
    rhel9cis_rule_5_1_16: false
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
