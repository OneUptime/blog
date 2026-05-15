# Validation Summary: How to Compare Kernel Live Patching vs Traditional Kernel Updates on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux kernel updates
- DNF package management
- Kernel live patching
- kpatch and kpatch-dnf
- systemd reboot workflow

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Applying patches with kernel live patching, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, updating RHEL content, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_updating-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 10 documentation: The Linux kernel, updating the kernel, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/the-linux-kernel
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/index

## Issues Found
- The post described traditional kernel updates as replacing the existing kernel package. Red Hat documents that DNF installs a new kernel for install-only kernel packages, so the wording was changed to say that a traditional update installs a new kernel package and boots into a new kernel image.
- The live-patching example used `sudo dnf install kpatch-patch -y` as the step to enable the DNF plugin. Red Hat documents installing `kpatch-dnf` and then using `dnf kpatch auto` for automatic subscription, or installing `"kpatch-patch = $(uname -r)"` for the current kernel. The command was changed to `sudo dnf kpatch auto`.
- The post constructed a package name with `kpatch-patch-$(uname -r | sed 's/\./-/g')`. Red Hat documents using `dnf search "$(uname -r)"` to find a matching live patch package and `dnf install/update "kpatch-patch = $(uname -r)"` to install or update it. The command was corrected.
- The comparison table said live patches include only critical/security fixes. Red Hat describes live patching as supporting simple security and bug fix updates, while also warning that not all critical or important CVEs can be addressed. The table and usage guidance were adjusted to reflect cumulative live patch fixes for a supported kernel and the need for live patch availability.
- The final full-kernel update command used `dnf update kernel`. This is valid in RHEL documentation, but it was changed to `dnf upgrade kernel` for consistency with current DNF terminology and RHEL 10 kernel update documentation.

## Review Notes
The post is technically relevant and accurate after the corrections. Future improvements could mention Red Hat's live patch support cadence and subscription requirements, but those details are outside the narrow comparison already covered by the post.
