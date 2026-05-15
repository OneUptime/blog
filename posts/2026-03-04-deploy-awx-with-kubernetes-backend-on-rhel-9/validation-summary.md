# Validation Summary: How to Deploy AWX with Kubernetes Backend on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- AWX
- Kubernetes
- RHEL 9
- systemd
- rpm

## Sources Consulted
- Ansible AWX Operator Documentation: https://docs.ansible.com/projects/awx-operator/
- Ansible AWX Operator Basic Install: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- Red Hat Enterprise Linux 9 documentation for managing system services with systemctl: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index

## Issues Found
- The post claims to be a step-by-step guide for deploying AWX with a Kubernetes backend on RHEL 9, but it does not include any AWX, AWX Operator, Kubernetes, kubectl, kustomize, namespace, custom resource, service exposure, or storage configuration steps.
- The commands are generic placeholders using `/etc/<service>/config.conf` and `<service-name>`. They cannot deploy AWX and do not correspond to the official AWX Operator installation flow.
- The post begins at "Step 2" and appears to be incomplete generated placeholder content rather than a technically usable tutorial.

## Review Notes
The official AWX Kubernetes installation path uses the AWX Operator deployed into a Kubernetes cluster, followed by creating AWX custom resources. A future replacement article should use those official installation steps and include explicit RHEL 9 prerequisites for the Kubernetes distribution, storage class, ingress or service exposure, and kubectl access.
