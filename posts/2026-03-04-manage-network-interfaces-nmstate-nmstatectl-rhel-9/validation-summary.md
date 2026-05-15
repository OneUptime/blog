# Validation Summary: How to Manage Network Interfaces Using Nmstate (nmstatectl) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nmstate
- nmstatectl
- NetworkManager
- YAML network state definitions
- Linux Ethernet, bonds, VLANs, and bridges
- Ansible RHEL system roles

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Introduction to Nmstate, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_introduction-to-nmstate_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Configuring Ethernet with static IP by using nmstatectl, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 documentation: Configuring a network bond by using nmstatectl, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Configuring a network bridge by using nmstatectl, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Automating system administration by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Nmstate CLI guide, https://nmstate.io/cli_guide.html
- Nmstate YAML API reference, https://nmstate.io/devel/yaml_api.html

## Issues Found
- The rollback section implied that every apply creates a user-managed checkpoint and showed `nmstatectl commit` and `nmstatectl rollback` without passing the checkpoint path. Updated the text to distinguish normal verification rollback from manual transaction control, capture the checkpoint path returned by `nmstatectl apply --no-commit`, and pass it to `commit` and `rollback`.
- The practical workflow used `nmstatectl commit` without the checkpoint from the preceding `--no-commit` apply. Updated the workflow to capture and commit the checkpoint explicitly.
- The Ansible section referred to an `nmstate` role. Red Hat documents Nmstate state application through the `network` RHEL system role and the `network_state` variable. Updated the wording and playbook example to use `redhat.rhel_system_roles.network` with `network_state`.

## Review Notes
The remaining nmstatectl commands and YAML examples align with Red Hat and Nmstate documentation. The examples use environment-specific interface names and IP addresses, so readers still need to adapt them to their hosts.
