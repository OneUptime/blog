# Validation Summary: How to Manage Virtual Machine CPU and Memory Resources on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux virtualization
- KVM/QEMU virtual machines
- libvirt and virsh
- vCPU hot-plugging and CPU pinning
- Memory ballooning
- CPU scheduler limits
- Domain XML CPU topology

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Monitoring and managing system status and performance, virtual CPU capping: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 10 Configuring and managing Linux virtual machines, vCPU management and CPU pinning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_linux_virtual_machines/configuring_and_managing_linux_virtual_machines
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- libvirt domain XML format reference: https://www.libvirt.org/formatdomain.html

## Issues Found
- The vCPU section described `virsh setvcpus ... --config` as a current live change. Updated the comments to clarify that `--config` affects the persistent configuration and takes effect on the next boot; live vCPU hot-add uses `--live`.
- The maximum vCPU example said it requires VM shutdown. Red Hat documents this as a persistent change that takes effect on the next boot, so the comment was updated accordingly.
- The memory section described `virsh setmem ... --live` as memory hot-add. The libvirt manual describes this as a live memory balloon operation, so the wording now says it adjusts current memory up to the configured maximum.
- The balloon-device check used `virsh dommemstat ... | grep balloon`, which is not a reliable way to confirm that the virtio balloon device is present. Changed it to inspect domain XML for the `memballoon` device.
- The CPU capping section relied on an implied default period. Red Hat documents setting `vcpu_period` and `vcpu_quota` for absolute vCPU caps, so the example now sets `vcpu_period=100000` explicitly before setting `vcpu_quota=50000`.

## Review Notes
The post is technically relevant and the corrected commands align with current Red Hat and libvirt documentation. Future improvements could mention `virtio-mem` for true live memory hot-plug on supported RHEL 9 releases, but adding that section was outside the requested scope because the current post focuses on `setmem` and ballooning.
