# Validation Summary: How to Add Custom Kernel Modules to the Initramfs with dracut on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- dracut and lsinitrd
- Linux kernel modules and module dependencies
- initramfs
- kmod tools: modinfo, modprobe, depmod
- DKMS
- GRUB and grubby

## Sources Consulted
- dracut(8) manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- dracut.conf(5) manual page: https://man7.org/linux/man-pages/man5/dracut.conf.5.html
- Red Hat Enterprise Linux 9 kernel documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 8 grubby boot entry documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/
- Red Hat Customer Portal note on EPEL support scope: https://access.redhat.com/solutions/3358
- DKMS project documentation: https://github.com/dkms-project/dkms
- kmod modprobe and depmod manual references: https://www.mankier.com/8/modprobe and https://www.mankier.com/8/depmod

## Issues Found
- The post described `force_drivers` as force-including modules regardless of hostonly detection. The dracut configuration manual defines it as similar to `add_drivers`, but with early loading via `modprobe`, so the comments were corrected.
- The firmware example used `install_items` to include an entire firmware directory. The documented `install_items` setting is for additional files, while `fw_dir` is the documented way to add firmware search directories, so the example was changed to use `fw_dir`.
- The DKMS section implied `sudo dnf install -y dkms` works from standard RHEL repositories. DKMS is typically supplied by EPEL or a vendor repository on RHEL, so the text now states that an appropriate repository must be enabled first.
- The DKMS `REMAKE_INITRD` description was tightened to say it rebuilds initramfs when DKMS installs the module, instead of implying broader automatic behavior.

## Review Notes
The remaining dracut, lsinitrd, depmod, modinfo, modprobe, and grubby command forms match the documented syntax. The DKMS section is still a generic example; real vendor modules often require module-specific `MAKE`, `CLEAN`, `BUILT_MODULE_LOCATION`, signing, or Secure Boot handling.
