# Validation Summary: How to Install and Configure AWX (Ansible Tower) on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- AWX
- Ansible Tower / Red Hat Ansible Automation Platform
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd
- DNF

## Sources Consulted
- AWX project README: https://github.com/ansible/awx
- AWX Operator documentation, Basic Install: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator README: https://github.com/ansible/awx-operator
- Red Hat Ansible Automation Platform documentation noting automation controller replaces Ansible Tower: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.1/html/red_hat_ansible_automation_platform_release_notes/anchor-aap_2.1-release

## Issues Found
- The post is a generic service-installation template rather than an AWX installation guide. It uses placeholders such as `<package-name>`, `<service>`, and `<service-name>` without identifying AWX packages, services, Kubernetes resources, or configuration files.
- The installation approach is technically inaccurate for current AWX. Official AWX installation documentation directs users to install AWX with the AWX Operator on a Kubernetes cluster using Kustomize/`kubectl`, not by installing an unspecified DNF package and restarting an unspecified systemd service.
- The configuration file path `/etc/<service>/config.conf` is not an AWX configuration path from the official AWX Operator installation flow.
- The title equates AWX with Ansible Tower. AWX is the upstream project for Red Hat Ansible Automation Platform, while current Red Hat documentation uses automation controller as the replacement for Ansible Tower.
- The post cannot be fixed with small technical corrections while preserving its structure and scope. Making it accurate would require replacing the placeholder content with a real AWX Operator or Red Hat Ansible Automation Platform installation guide.

## Review Notes
This post should be removed or replaced with a complete, version-specific guide. A future replacement should distinguish AWX from Red Hat Ansible Automation Platform automation controller, specify the supported installation method, list real prerequisites such as Kubernetes and `kubectl`, and avoid placeholder commands.
