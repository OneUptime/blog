# How to Automate RHEL Security Hardening with Ansible and OpenSCAP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, OpenSCAP, Security, Hardening, Compliance, Linux

Description: Automate RHEL security hardening using Ansible playbooks generated from OpenSCAP compliance profiles to enforce security baselines at scale.

---

OpenSCAP is a compliance scanning tool that checks systems against security benchmarks like CIS and DISA STIG. You can generate Ansible playbooks from OpenSCAP profiles and apply them to harden RHEL systems automatically.

## Installing Required Packages

On your Ansible control node, install the SCAP tools:

```bash
# Install OpenSCAP and the SCAP Security Guide
sudo dnf install -y scap-security-guide openscap-scanner openscap-utils
```

## Generating an Ansible Playbook from a SCAP Profile

List available profiles and generate a remediation playbook:

```bash
# List available SCAP profiles for RHEL 9
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml | grep "Profile:"

# Generate an Ansible playbook for the CIS Level 2 Server profile
oscap xccdf generate fix \
  --fix-type ansible \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --output cis-hardening-playbook.yml \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Customizing and Running the Playbook

Review and modify the generated playbook before applying it:

```yaml
# cis-hardening-playbook.yml (snippet - review before running)
---
- name: CIS Hardening for RHEL 9
  hosts: all
  become: true
  tasks:
    # Ensure permissions on /etc/passwd are configured
    - name: Set permissions on /etc/passwd
      file:
        path: /etc/passwd
        owner: root
        group: root
        mode: '0644'

    # Ensure firewalld is running
    - name: Enable firewalld
      service:
        name: firewalld
        state: started
        enabled: true
```

Run the hardening playbook:

```bash
# Apply hardening to target hosts (use --check first for a dry run)
ansible-playbook cis-hardening-playbook.yml -i inventory.ini --check

# Apply for real after reviewing the dry run output
ansible-playbook cis-hardening-playbook.yml -i inventory.ini
```

## Scanning After Remediation

Verify compliance after applying the hardening:

```bash
# Run an OpenSCAP scan on a remote host via SSH
ssh admin@server1.example.com \
  "sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis \
    --report /tmp/cis-report.html \
    /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml"

# Copy the report back to your control node
scp admin@server1.example.com:/tmp/cis-report.html .
```

Open the HTML report in a browser to review the compliance score and any remaining findings. This workflow lets you harden and audit RHEL servers at scale using Ansible.
