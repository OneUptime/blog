# Validation Summary: How to Implement a Patch Management Strategy for RHEL 9 Fleets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF and DNF security update metadata
- dnf-plugins-core needs-restarting plugin
- Red Hat Satellite / Hammer CLI
- Ansible ansible.builtin.dnf, ansible.builtin.command, and ansible.builtin.reboot modules

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing and monitoring security updates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/index
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF needs-restarting plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- Red Hat Satellite 6.17: Managing content views: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html/managing_content/managing_content_views_content-management
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html

## Issues Found
- The assessment command used `dnf updateinfo list security`, which is less precise for pending RHEL security updates than Red Hat's documented `dnf updateinfo list updates security`. Updated the command to match Red Hat's RHEL 9 documentation.
- The CVE lookup example used a space-separated `--cve` argument. Updated it to `--cve=CVE-2025-XXXX`, matching the DNF command reference option form.
- The verification commands used standalone `needs-restarting`. Updated them to `dnf needs-restarting -r` and `dnf needs-restarting -s`, matching the DNF plugin invocation documented for RHEL 9-era systems.
- The Satellite Hammer example omitted the content view version to promote. Added `--version 1`, matching Red Hat Satellite's documented `hammer content-view version promote` examples.
- The Ansible reboot task was labeled "Reboot if needed" but rebooted whenever security updates changed packages. Added a `dnf needs-restarting -r` check and made the reboot conditional on its reboot-required exit code.

## Review Notes
The post is technically relevant and the corrected commands align with current RHEL 9, DNF, Satellite, and Ansible documentation. In production, teams should substitute real CVE, advisory, content view version, organization, and inventory values, and should account for maintenance windows and application-specific service restart policies.
