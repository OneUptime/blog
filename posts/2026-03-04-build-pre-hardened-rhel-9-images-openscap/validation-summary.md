# Validation Summary: How to Build Pre-Hardened RHEL Images with OpenSCAP Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder / osbuild-composer / composer-cli
- OpenSCAP and SCAP Security Guide
- HashiCorp Packer QEMU builder
- Ansible remediation playbooks
- systemd first-boot services
- AIDE, auditd, firewalld, SSH host keys, and Linux hardening settings

## Sources Consulted
- Red Hat documentation: RHEL Image Builder description and output formats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Red Hat documentation: Creating system images with composer-cli and supported blueprint customizations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat documentation: Creating pre-hardened images with RHEL Image Builder OpenSCAP integration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/assembly_creating-pre-hardened-images-with-image-builder-openscap-integration_composing-a-customized-rhel-system-image
- Red Hat documentation: Enabling FIPS mode with RHEL Image Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/enabling-fips-mode-with-rhel-image-builder_composing-a-customized-rhel-system-image
- Red Hat documentation: RHEL 9 Security hardening and OpenSCAP scans/remediation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- HashiCorp Developer documentation: Packer QEMU builder: https://developer.hashicorp.com/packer/plugins/builders/qemu

## Issues Found
- The Image Builder blueprint did not use the documented OpenSCAP blueprint customization, so the image build would not apply OpenSCAP remediation through Image Builder. Added `[customizations.openscap]` with the STIG profile ID.
- The blueprint used `[customizations.kernel] append = "fips=1"` for FIPS mode. Red Hat documents `fips = true` under `[customizations]` for RHEL Image Builder, so the blueprint was updated accordingly.
- The firewall services customization used `[[customizations.firewall.services]]`, an array-of-tables form. Red Hat documents `[customizations.firewall.services]` as a single table, so the TOML was corrected.
- The blueprint had a "Remove unnecessary packages" comment followed by a `[[packages]]` entry for `cups`, which would install the package instead of removing it. Removed that package entry and kept the service disabled/masked elsewhere.
- The post-build Ansible remediation command omitted the documented `ANSIBLE_COLLECTIONS_PATH` environment variable and package prerequisites needed by the Red Hat remediation playbook flow. Added `ansible-core` and `rhc-worker-playbook` to the blueprint package list and updated the command.
- The compliance result counters searched for `result="pass"` and `result="fail"`, but OpenSCAP XCCDF result XML uses result elements such as `<result>pass</result>`. Updated the grep patterns.
- The first-boot script wrote scan output under `/var/log/compliance` without creating the directory in that snippet. Added `mkdir -p /var/log/compliance`.

## Review Notes
The post is technically valid after the fixes. For future improvement, the Packer example still assumes a working Kickstart file, reachable RHEL installation ISO, and valid checksum, which are appropriate placeholders for a tutorial but are not a complete runnable Packer build by themselves.
