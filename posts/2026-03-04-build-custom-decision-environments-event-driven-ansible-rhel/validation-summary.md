# Validation Summary: How to Build Custom Decision Environments for Event-Driven Ansible on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ansible Automation Platform
- Event-Driven Ansible
- Ansible Rulebook
- Ansible Builder
- Decision environments
- Podman
- Ansible Galaxy collections

## Sources Consulted
- Ansible Builder installation requirements: https://docs.ansible.com/projects/builder/en/latest/installation/
- Ansible Builder v3 execution environment definition reference: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage reference: https://docs.ansible.com/projects/builder/en/stable/usage/
- Ansible Rulebook CLI usage reference: https://docs.ansible.com/projects/rulebook/en/latest/usage.html
- Ansible Rulebook decision environment reference: https://docs.ansible.com/projects/rulebook/en/v1.1.5/decision_environment.html
- Red Hat Ansible Automation Platform 2.6 decision environment documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/html/using_automation_decisions/eda-decision-environments
- Ansible Core collection installation and requirements file documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections_guide/collections_installing.html

## Issues Found
- The base image used an unversioned Red Hat registry namespace. Updated it to `registry.redhat.io/ansible-automation-platform-26/de-minimal-rhel9:latest`, matching the current AAP 2.6 decision environment documentation.
- The definition attempted to install `ansible.eda` even though Red Hat documents that `ansible.eda` is already installed in `de-minimal`. Removed it from the Galaxy collection list and added `exclude.all_from_collections` for `ansible.eda`.
- The Red Hat `de-minimal` example uses `python_interpreter.package_system: "python3.12"` and `options.package_manager_path: /usr/bin/microdnf`. Added those fields so the example matches the documented base-image pattern.
- The testing command used `ansible-rulebook --decision-env`, but the documented `ansible-rulebook` CLI has no `--decision-env` option. Replaced it with a `podman run` command that runs `ansible-rulebook` inside the custom decision environment image.
- The local collection tarball example used `name` plus `source` for a local file. Updated it to the documented collection requirements format for a local tarball: `name: ./collections/...tar.gz` with `type: file`.
- The custom event source instructions said to create a requirements file, but the example creates a directory and uses inline `dependencies.galaxy`. Updated the comment to describe the actual directory being created.

## Review Notes
- I could not verify the examples by running Ansible Builder, Ansible Rulebook, or Podman locally because those commands are not installed in this workspace.
- Red Hat decision environment image names are tied to the target Ansible Automation Platform version. The post now uses AAP 2.6, which is current in the consulted Red Hat documentation.
