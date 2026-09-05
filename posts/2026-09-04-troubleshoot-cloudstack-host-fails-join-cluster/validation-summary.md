# Validation Summary: How to Troubleshoot a CloudStack Host That Fails to Join a Cluster

## Status
validated

## Post Type
Technical troubleshooting guide with Linux commands and a sudoers configuration example.

## Technologies Covered
- Apache CloudStack 4.23 and KVM host enrollment
- Linux, systemd, OpenSSH, sudo, and chrony
- Java 17, TLS certificates, and the CloudStack CA framework
- KVM, QEMU, and libvirt
- Linux bridges, DNS, TCP connectivity, and management-server load balancing
- NFS and Ceph RBD storage
- SELinux and AppArmor

## Sources Consulted
- Apache CloudStack Adding Hosts (certificate provisioning, host lifecycle, and agent addressing): https://docs.cloudstack.apache.org/en/latest/adminguide/hosts.html
- Apache CloudStack KVM Host Installation (Java, sudoers, cluster requirements, bridges, and security policies): https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html
- Apache CloudStack management-server reliability: https://docs.cloudstack.apache.org/en/latest/adminguide/reliability.html
- Apache CloudStack host and storage tags: https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html
- Apache CloudStack agent configuration source: https://raw.githubusercontent.com/apache/cloudstack/main/agent/conf/agent.properties
- libvirt connection URIs: https://libvirt.org/uri.html
- libvirt virsh command reference: https://libvirt.org/manpages/virsh.html
- libvirt host validation: https://libvirt.org/manpages/virt-host-validate.html
- QEMU command-line reference: https://www.qemu.org/docs/master/system/invocation.html
- Ceph RBD integration with libvirt: https://docs.ceph.com/en/latest/rbd/libvirt/
- chrony command reference: https://chrony-project.org/doc/4.6/chronyc.html
- OpenBSD/OpenSSH command manuals: https://man.openbsd.org/ssh and https://man.openbsd.org/nc
- Upstream systemd manuals mirrored by man7: https://man7.org/linux/man-pages/man1/systemctl.1.html, https://man7.org/linux/man-pages/man1/journalctl.1.html, and https://man7.org/linux/man-pages/man1/timedatectl.1.html
- Linux NFS utilities and mount manuals: https://man7.org/linux/man-pages/man8/showmount.8.html, https://man7.org/linux/man-pages/man8/rpcinfo.8.html, https://man7.org/linux/man-pages/man5/nfs.5.html, https://man7.org/linux/man-pages/man8/mount.8.html, and https://man7.org/linux/man-pages/man8/umount.8.html
- Linux network and system inspection manuals: https://man7.org/linux/man-pages/man8/ip.8.html, https://man7.org/linux/man-pages/man8/bridge.8.html, https://man7.org/linux/man-pages/man8/findmnt.8.html, https://man7.org/linux/man-pages/man1/getent.1.html, https://man7.org/linux/man-pages/man1/hostname.1.html, and https://man7.org/linux/man-pages/man1/lscpu.1.html
- GNU utility manuals mirrored by man7: https://man7.org/linux/man-pages/man1/tail.1.html, https://man7.org/linux/man-pages/man1/grep.1.html, and https://man7.org/linux/man-pages/man1/date.1.html

## Issues Found
1. **Bootstrap log interpretation:** Absence of an agent log entry does not distinguish an SSH failure from other failures before agent startup. Changed the introduction to the evidence table to direct readers to the host SSH/authentication logs as well as the management log.
2. **Hypervisor validation scope:** Bare `virt-host-validate` checks all supported hypervisors, potentially reporting unrelated failures. Specified `qemu` for this KVM procedure.
3. **Security-policy attribution:** The production enforcing recommendation in Apache’s guide specifically concerns SELinux. Corrected the wording to distinguish that recommendation from its libvirt AppArmor profile instructions.
4. **Cluster requirements:** The original reference to compatible CPU characteristics softened Apache’s stated prerequisites. Matched the documented requirement for identical distribution versions and CPU type, count, and flags.
5. **CPU capability diagnostic:** `virsh cpu-models` lists models known to libvirt, not the models usable on the host. Replaced the truncated list with a KVM domain-capabilities query using the explicit system connection.
6. **NFS diagnostic limitations:** The NFSv4.1 example did not explain that MOUNT/rpcbind discovery can fail independently of NFSv4 service availability. Added that qualification, specified the server-visible export path, and clarified that a read-only mount cannot establish write access.

## Review Notes
- Confirmed the documented Java 17 requirement for CloudStack 4.23, sudo-based setup, interface naming constraints, and bridge mappings. The narrow sudoers example matches Apache’s installation guide.
- Confirmed agent TCP connections on port 8250, VIP persistence guidance, SSH-based CA enrollment, and forced certificate recovery with agent/libvirtd restarts. Host and storage tags affect allocation separately from enrollment.
- All five technical documentation links in the post resolved to the intended resources. The `latest` CloudStack documentation identified itself as 4.23.0.0 during review; these URLs and the main-branch source are moving references.
- Commands assume a Linux KVM host with the relevant packages installed. The example QEMU executable targets x86_64 and can have a distribution-specific location. The service checks follow the documented libvirtd setup.
- `systemctl is-active` with multiple units returns success if any is active; readers must inspect each printed state. The post uses it as an interactive diagnostic rather than a scripted all-services assertion.
- Domain capabilities assist comparison but do not prove live-migration compatibility; the post correctly retains a migration test before enabling HA workloads. TCP reachability likewise does not prove TLS enrollment.
- Reviewed commands and configuration against documentation and checked every Bash block with `bash -n`. No live CloudStack cluster was available, so enrollment, storage access, certificate recovery, instance placement, and migration were not executed.
- Parsed validation.json and checked the edited files for whitespace errors. Changes were limited to technical corrections and the two requested review artifacts.
