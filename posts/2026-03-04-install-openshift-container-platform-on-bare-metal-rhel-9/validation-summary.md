# Validation Summary: How to Install OpenShift Container Platform on Bare-Metal RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- OpenShift Container Platform
- Kubernetes
- Bare-metal infrastructure
- Linux systemd and firewalld commands

## Sources Consulted
- Red Hat OpenShift Container Platform documentation: Installing a user-provisioned cluster on bare metal, https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/installing_on_bare_metal/installing-bare-metal
- Red Hat OpenShift Container Platform documentation: Installer-provisioned infrastructure for bare metal, https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/installing_on_bare_metal/installer-provisioned-infrastructure/
- Red Hat OpenShift Container Platform documentation: Installing on bare metal, OpenShift Container Platform 4.20, https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/installing_on_bare_metal/

## Issues Found
- The post does not provide a real OpenShift Container Platform bare-metal installation procedure. It uses placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which cannot be executed or validated as an OpenShift installation workflow.
- The post incorrectly presents OpenShift installation as installing and enabling a generic Linux service with `dnf`, `systemctl`, and `firewall-cmd`. Red Hat's bare-metal OpenShift installation process uses the OpenShift installer, installation assets such as `install-config.yaml` and Ignition configs, RHCOS nodes, DNS/load-balancing requirements, and bootstrap/install completion checks.
- The prerequisite "RHEL with a minimal or standard installation" is misleading for a bare-metal OpenShift cluster. Red Hat documentation states that bootstrap and control plane machines must use Red Hat Enterprise Linux CoreOS, while RHEL is only an option for compute machines in supported versions.
- The commands `sudo dnf install -y epel-release`, `sudo dnf groupinstall -y "Development Tools"`, `sudo systemctl enable --now <service>`, `sudo <service> --test`, and `sudo firewall-cmd --permanent --add-service=<service>` are not part of the documented OpenShift bare-metal installation path and do not install OpenShift Container Platform.
- The article is a placeholder with no salvageable implementation details for the stated title, so it was classified as `not-technically-relevant`. Per the review instructions, the post content was not rewritten.

## Review Notes
The topic itself is valid, but the current article should be replaced with a real OpenShift bare-metal installation guide that chooses a supported installation method, such as user-provisioned infrastructure, installer-provisioned infrastructure, Assisted Installer, or Agent-based Installer, and documents the version-specific prerequisites and installation commands for that method.
