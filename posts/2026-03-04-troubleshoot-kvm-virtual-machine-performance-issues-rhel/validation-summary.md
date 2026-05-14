# Validation Summary: How to Troubleshoot KVM Virtual Machine Performance Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- KVM virtualization
- libvirt and virsh
- QEMU
- virtio storage and networking
- TuneD
- Linux performance monitoring tools: top, vmstat, iostat, virt-top, iperf3

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Configuring and managing Linux virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_linux_virtual_machines/configuring_and_managing_linux_virtual_machines
- Red Hat Enterprise Linux 8 documentation, "Configuring and managing virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/configuring_and_managing_virtualization/red-hat-virtualization-solutions_virt-overview
- Red Hat Enterprise Linux 7 Virtualization Deployment and Administration Guide, "Steal Time Accounting": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_deployment_and_administration_guide/sect-kvm_guest_timing_management-steal_time_accounting
- Red Hat Enterprise Linux 7 Virtualization Tuning and Optimization Guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/virtualization_tuning_and_optimization_guide/virtualization_tuning_and_optimization_guide
- libvirt virsh command reference: https://download.libvirt.org/virshcmdref/html/chap-Virsh_Command_Reference-Commands.html
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- Local command help for iostat, vmstat, top, and pgrep.

## Issues Found
- The CPU overcommitment example labeled `nproc` output as physical CPUs. `nproc` reports available processing units, which usually corresponds to logical CPUs, so the wording was changed to "host logical CPUs."
- The balloon statistics command was described as checking status inside the VM, but `virsh dommemstat` is run from the host against a libvirt domain. The comment was corrected to say it checks balloon statistics from the host.
- The disk cache recommendation said `cache='none'` or `cache='writeback'` were both recommended for best performance. Red Hat documents `cache='none'` as the generally safe high-performance option for intensive I/O and live migration, while `writeback` can be faster than writethrough but has host-failure data-loss risk. The guidance was updated to include that distinction.
- The IOThread example only added `<iothreads>2</iothreads>` and then mentioned mapping disks. Red Hat's documented XML maps a disk using the `iothread` attribute in the disk driver element, so an example driver line with `iothread='1'` was added.

## Review Notes
- The remaining monitoring commands and virsh subcommands are valid for a RHEL/libvirt KVM host when the relevant packages are installed and the VM/device names are adjusted for the local environment.
- `virt-top`, `iostat`, and `iperf3` may require installing their corresponding packages on a minimal RHEL system.
- `vnet0` and `vda` are examples; production guests may expose different libvirt interface targets or disk target names.
