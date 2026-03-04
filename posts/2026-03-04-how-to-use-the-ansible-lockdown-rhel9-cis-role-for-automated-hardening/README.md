# How to Use the Ansible Lockdown RHEL9-CIS Role for Automated Hardening

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Ansible, Compliance, Security

Description: Step-by-step guide on use the ansible lockdown rhel9-cis role for automated hardening with practical examples and commands.

---

The Ansible Lockdown RHEL9-CIS role automates CIS benchmark hardening on RHEL 9 systems for consistent security compliance.

## Prerequisites

- Ansible installed on your control node
- RHEL 9 target systems
- Root or sudo access on targets

## Install the Role

```bash
ansible-galaxy install ansible-lockdown.rhel9_cis
```

Or clone from GitHub:

```bash
git clone https://github.com/ansible-lockdown/RHEL9-CIS.git
cd RHEL9-CIS
```

## Configure the Inventory

```ini
# inventory/hosts
[rhel9_servers]
server1.example.com
server2.example.com

[rhel9_servers:vars]
ansible_user=admin
ansible_become=true
```

## Create the Playbook

```yaml
---
# harden-rhel9.yml
- name: Apply CIS Benchmark to RHEL 9
  hosts: rhel9_servers
  become: true

  vars:
    rhel9cis_section1: true
    rhel9cis_section2: true
    rhel9cis_section3: true
    rhel9cis_section4: true
    rhel9cis_section5: true
    rhel9cis_section6: true

  roles:
    - ansible-lockdown.rhel9_cis
```

## Customize Controls

Disable specific controls that conflict with your environment:

```yaml
vars:
  # Skip specific rules
  rhel9cis_rule_1_1_1_1: false  # Disable cramfs check
  rhel9cis_rule_5_2_4: false    # Skip SSH MaxAuthTries

  # Configure password policy
  rhel9cis_pass_max_days: 90
  rhel9cis_pass_min_days: 7
  rhel9cis_pass_warn_age: 14

  # Configure audit settings
  rhel9cis_max_log_file_size: 100
```

## Run in Check Mode First

```bash
ansible-playbook -i inventory harden-rhel9.yml --check --diff
```

## Apply the Hardening

```bash
ansible-playbook -i inventory harden-rhel9.yml
```

## Verify Compliance

Run an OpenSCAP scan to verify:

```bash
sudo dnf install -y openscap-scanner scap-security-guide
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --results results.xml \
  --report report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Schedule Regular Runs

```bash
# Add to crontab or use Ansible Tower/AWX for scheduled runs
0 2 * * 0 ansible-playbook -i /etc/ansible/inventory /opt/playbooks/harden-rhel9.yml
```

## Conclusion

The Ansible Lockdown RHEL9-CIS role automates CIS benchmark compliance on RHEL 9. Customize controls for your environment, test in check mode first, and run regularly to maintain compliance.

