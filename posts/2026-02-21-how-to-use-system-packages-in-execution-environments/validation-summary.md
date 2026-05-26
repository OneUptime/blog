# Validation Summary: How to Use System Packages in Execution Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Execution Environments
- ansible-builder
- bindep
- Podman
- RPM/dnf package management
- Debian/dpkg package management
- Ansible playbooks

## Sources Consulted
- Ansible Builder execution environment definition documentation: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder collection-level dependency documentation: https://docs.ansible.com/projects/builder/en/latest/collection_metadata/
- bindep official documentation: https://docs.opendev.org/opendev/bindep/latest/readme.html
- bindep usage documentation: https://docs.opendev.org/opendev/bindep/latest/usage.html
- bindep 2.14.0 package source, `bindep/depends.py`, downloaded from PyPI: https://pypi.org/project/bindep/
- Ansible Runner container documentation for the `quay.io/ansible/ansible-runner:latest` image: https://docs.ansible.com/projects/runner/en/2.3.3/container/

## Issues Found
- The basic bindep example labeled `gcc [compile]` as always installed. In bindep/ansible-builder, `compile` is a profile used for build-time dependencies, not an always-installed selector. Changed the comment to say it is installed during the compile/build stage in ansible-builder.
- The platform selector list described itself as the available platform selectors and included `platform:centos-stream-9`. bindep derives CentOS version selectors such as `platform:centos-9`; `platform:centos-stream-9` is not the generated selector. Changed the wording to "common platform selectors" and corrected the CentOS 9 example to `platform:centos-9`.
- The selector-combination explanation said a package is installed if any selector matches. bindep treats platform selectors as filters when combined with ordinary profiles such as `compile`. Updated the wording to distinguish multiple platform selectors from combined platform/profile selectors.
- The example comment said "RHEL or CentOS 8+" but only listed RHEL 8/9 and CentOS 8 selectors. Updated the comment to match the selector list.

## Review Notes
The examples are otherwise consistent with Ansible Builder version 3 syntax, bindep syntax, and common Podman verification commands. The post uses `dnf` directly in RPM-focused examples; using `$PKGMGR` would be more portable in ansible-builder build steps, but the current examples are technically correct for dnf-based base images.
