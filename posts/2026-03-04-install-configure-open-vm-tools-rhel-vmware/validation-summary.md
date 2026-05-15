# Validation Summary: How to Install and Configure Open VM Tools on RHEL in VMware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- VMware vSphere/ESXi
- Open VM Tools
- systemd
- dnf
- chrony

## Sources Consulted
- VMware open-vm-tools official repository: https://github.com/vmware/open-vm-tools
- Broadcom VMware KB, "Disabling Time Synchronization for virtual machines": https://knowledge.broadcom.com/external/article/326306/disabling-time-synchronization-for-virtu.html
- Broadcom VMware KB, "Enable content Copy/Paste between VMRC client and Windows/Linux Virtual Machine": https://knowledge.broadcom.com/external/article/319537/enable-content-copypaste-between-vmrc-cl.html
- Broadcom VMware KB, "Enable and disable guest customization in VM Tools 11.1.0": https://knowledge.broadcom.com/external/article/320065/enable-and-disable-guest-customization-i.html
- Red Hat Customer Portal, "Running a Red Hat Enterprise Linux 7 virtual machine on a VMware host using open-vm-tools": https://access.redhat.com/articles/1282083

## Issues Found
- The post said `open-vm-tools-desktop` made shared folders available and instructed readers to configure shared folders in vSphere VM settings. VMware documents shared folders as a VMware Workstation/Fusion feature, while vSphere copy/paste support is separate and disabled by default. I changed the section to focus on clipboard sharing and noted the vSphere advanced-setting requirement.
- The post used `vmware-toolbox-cmd config get deployPkg enable-custom-scripts` as a general guest customization verification command. Broadcom documents `deployPkg enable-customization` for enabling or disabling Linux guest customization, so I changed the command to check `enable-customization`.
- The post said `vmtoolsd` syncs guest time with the ESXi host by default. Broadcom documents periodic VMware Tools time synchronization as disabled by default, while one-off synchronization events are enabled by default. I corrected the wording to describe the `timesync` command as periodic time synchronization.

## Review Notes
The remaining installation, service management, status, update, and troubleshooting commands are consistent with RHEL packaging and VMware open-vm-tools behavior. For production RHEL guests, VMware recommends using a native time synchronization service such as chrony/NTP and disabling periodic VMware Tools time synchronization to avoid competing time sources.
