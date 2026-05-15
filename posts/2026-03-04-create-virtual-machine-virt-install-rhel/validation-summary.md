# Validation Summary: How to Create a Virtual Machine Using virt-install on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM
- libvirt
- virt-install
- virsh
- Kickstart
- VNC and serial console VM access

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Current virt-install man page: https://www.mankier.com/1/virt-install
- Red Hat Enterprise Linux 7: Removing and Deleting a Virtual Machine: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_deployment_and_administration_guide/sect-virsh-delete
- Red Hat OpenShift documentation references for RHEL libosinfo short IDs, including rhel9.4: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/pdf/postinstallation_configuration/OpenShift_Container_Platform-4.20-Postinstallation_configuration-en-US.pdf

## Issues Found
- The post used `--os-variant` throughout. Current `virt-install` documentation treats `--osinfo` and `--os-variant` as aliases, but states that `--osinfo` is the preferred new-style naming, and RHEL 9 documentation uses `--osinfo` in its VM creation examples. Updated all examples and explanatory text to use `--osinfo`.
- The post suggested `osinfo-query os | grep rhel` to list OS variants. This can still provide useful libosinfo output, but RHEL 9 documentation and the current `virt-install` man page recommend `virt-install --osinfo list` for accepted `virt-install` values. Updated the command and final note accordingly.

## Review Notes
- The examples are otherwise consistent with RHEL/libvirt documentation: `--cdrom`, `--location`, `--initrd-inject`, `--extra-args`, `--disk`, `--import`, `--graphics none`, `virsh console`, `virsh list --all`, `virsh start`, `virsh shutdown`, and `virsh undefine --remove-all-storage` are valid usages.
- The `--location http://repo.example.com/rhel9/` examples assume that the URL points to a valid RHEL installation tree, as required by RHEL documentation.
- `--graphics vnc,listen=0.0.0.0` exposes the VNC listener on all interfaces. This can be useful in some lab environments but should be restricted or protected in production.
