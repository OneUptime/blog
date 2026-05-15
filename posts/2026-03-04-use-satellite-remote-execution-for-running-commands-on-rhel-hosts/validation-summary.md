# Validation Summary: How to Use Satellite Remote Execution for Running Commands on RHEL Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Satellite remote execution
- Red Hat Enterprise Linux hosts
- Satellite Capsule / foreman-proxy SSH remote execution
- Hammer CLI
- Satellite Ansible integration
- Satellite errata management

## Sources Consulted
- Red Hat Satellite 6.19 Managing hosts, "Configuring and setting up remote jobs": https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/managing_hosts/configuring-and-setting-up-remote-jobs
- Red Hat Satellite 6.19 Hammer reference, "job-invocation": https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/hammer_reference/hammer-job-invocation
- Red Hat Satellite 6.18 Managing configurations by using Ansible integration: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html-single/managing_configurations_by_using_ansible_integration/managing_configurations_by_using_ansible_integration
- Red Hat Satellite 6.18 Hammer reference, "ansible roles": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-ansible
- Red Hat Satellite 6.18 Managing content, "Managing errata": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/pdf/managing_content/Red_Hat_Satellite-6.18-Managing_content-en-US.pdf

## Issues Found
- The errata installation example used `--job-template "Install Errata - Katello Script Default"`. Current Red Hat Satellite documentation shows applying errata through Hammer with `--feature katello_errata_install`, which selects the job template assigned to that remote execution feature. Updated the example to use `--feature katello_errata_install`.

## Review Notes
- The Satellite remote execution overview, SSH push transport explanation, SSH key distribution example, `hammer job-invocation` options, scheduling with `--start-at`, job output retrieval, and Ansible role synchronization commands align with the consulted Red Hat documentation.
- The exact availability and names of job templates can vary if an administrator customizes Satellite templates. The reviewed examples assume the default templates and feature mappings are still present.
