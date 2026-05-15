# Validation Summary: How to Build and Install a Custom Kernel on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel build system
- RPM and source RPM packaging
- DNF and dnf-plugins-core
- GRUB, grubby, Boot Loader Specification entries
- dracut initramfs generation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- Red Hat Enterprise Linux 9 documentation: Packaging and distributing software: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/packaging_and_distributing_software/packaging_and_distributing_software
- Linux kernel documentation: Linux kernel release 6.x README: https://www.kernel.org/doc/html/latest/admin-guide/README.html
- Linux kernel documentation: How to quickly build a trimmed Linux kernel: https://www.kernel.org/doc/html/v6.13/admin-guide/quickly-build-trimmed-linux.html
- dnf-plugins-core documentation: DNF download plugin: https://dnf-plugins-core.readthedocs.io/en/stable/download.html

## Issues Found
- The post installed `yum-utils` immediately before using `dnf download --source kernel`. The documented provider for the `dnf download` plugin is `dnf-plugins-core`, so the dependency list now installs `dnf-plugins-core`.
- The RHEL source RPM path implied that `~/rpmbuild/SOURCES/` was a ready kernel source tree for the later `make` workflow. A source RPM installs source archives, patches, and a spec file into the RPM build tree, so the post now clarifies that the RHEL source RPM workflow should build through `~/rpmbuild/SPECS/kernel.spec`.
- The post used `rpm -ivh` for source RPM installation. This can work for a first install, but `rpm -Uvh` is the safer documented pattern for installing or updating source RPM contents in the RPM build tree. Both source RPM examples were updated.
- The non-RPM build section ran `make -j$(nproc)` and then `make modules -j$(nproc)`. A normal kernel `make` builds the selected kernel image and configured modules, so the separate module build was redundant and potentially misleading. The duplicate command was removed.
- The post stated that `make install` copies the image, generates initramfs, and updates GRUB as an unconditional result. Kernel documentation says `make install` delegates to the distribution's kernel installer when available, and behavior depends on that installer. The wording now says to verify those results after installation.
- The manual removal instructions deleted `/boot` files and `/lib/modules` but did not remove the RHEL 9 BLS boot entry. The removal example now deletes the matching `/boot/loader/entries/` file before rebuilding GRUB metadata.
- The patched RHEL source build omitted installation of spec-declared build dependencies. The workflow now runs `sudo dnf builddep SPECS/kernel.spec -y` before building.

## Review Notes
The tutorial is technically relevant and broadly accurate after the fixes. Future improvements could note that custom kernels built from upstream `kernel.org` sources are not the same as Red Hat-supported RHEL kernels, and Secure Boot systems may require signing custom kernel artifacts before booting them.
