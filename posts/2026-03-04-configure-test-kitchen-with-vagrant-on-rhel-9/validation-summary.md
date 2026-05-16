# Validation Summary: How to Configure Test Kitchen with Vagrant on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Test Kitchen
- Vagrant
- vagrant-libvirt / libvirt
- Chef InSpec
- Ruby gems
- Shell provisioning
- Ansible provisioning
- firewalld
- Apache httpd

## Sources Consulted
- Test Kitchen kitchen.yml documentation: https://kitchen.ci/docs/getting-started/kitchen-yml/
- Test Kitchen configuration reference: https://kitchen.ci/docs/reference/configuration/
- Test Kitchen Vagrant driver documentation: https://kitchen.ci/docs/drivers/vagrant/
- Test Kitchen shell provisioner documentation: https://kitchen.ci/docs/provisioners/shell/
- Test Kitchen InSpec verifier documentation: https://kitchen.ci/docs/verifiers/inspec/
- Test Kitchen lifecycle hooks documentation: https://kitchen.ci/docs/reference/lifecycle-hooks/
- Chef Workstation Test Kitchen documentation: https://docs.chef.io/workstation/25/tools/kitchen/
- Chef InSpec firewalld resource documentation: https://docs.chef.io/inspec/7.0/resources/firewalld/
- kitchen-vagrant project README: https://github.com/test-kitchen/kitchen-vagrant
- kitchen-ansible project README: https://github.com/neillturner/kitchen-ansible
- Ansible dnf module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Vagrant provider configuration documentation: https://developer.hashicorp.com/vagrant/docs/providers/configuration
- vagrant-libvirt configuration documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/configuration.html
- Red Hat RHEL 9 Vagrant image builder documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-vagrant-boxes-with-rhel-image-builder_composing-a-customized-rhel-system-image

## Issues Found
- The post said `kitchen init` creates `.kitchen.yml`. Current Test Kitchen documentation prefers and generates `kitchen.yml`, while the dotted filename remains backward compatible. Updated the text, heading, and inline config comment to use `kitchen.yml`.
- The shell provisioning script configured firewalld rules but did not install or start firewalld first. Updated the package installation and service startup commands so the firewall commands and InSpec firewalld tests can run reliably on minimal RHEL-style boxes.
- The Ansible example installed and started only `httpd`, while the earlier InSpec tests also expected firewalld rules and a specific page body. Updated the playbook to install and start firewalld, add the same HTTP/HTTPS firewall services, reload firewalld, and write the same page content expected by the tests.
- The Ansible example used the older `systemd` module name. Updated it to `systemd_service`, the current documented module name.

## Review Notes
- `generic/rhel9`, `generic/centos9s`, and `generic/rocky9` are Vagrant box names rather than Red Hat-provided image builder outputs. For production RHEL workflows, Red Hat's supported approach is to build a `vagrant-libvirt` or `vagrant-virtualbox` box with RHEL image builder.
- The CI example is syntactically plausible, but running Vagrant/libvirt inside CI requires a runner with nested virtualization or a privileged virtualization host.
