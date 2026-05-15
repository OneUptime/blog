# Validation Summary: How to Run RHEL on Raspberry Pi 4 Using the aarch64 Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for ARM 64
- Raspberry Pi 4 Model B
- AArch64 / ARM64
- UEFI firmware
- Linux storage and filesystem tools (`dd`, `parted`, `xfs_growfs`)
- Red Hat subscription management
- NetworkManager (`nmcli`)

## Sources Consulted
- Red Hat Customer Portal: Which Arm-based servers are supported by Red Hat Enterprise Linux for ARM 64? https://access.redhat.com/solutions/6673691
- Red Hat Documentation: RHEL 9 system requirements and supported architectures. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/system-requirements-and-supported-architectures_rhel-installer
- Red Hat Documentation: KVM guest images are qcow2 VM images with cloud-init and locked root password. https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html/provisioning_hosts/building_cloud_images_provisioning
- Arm SystemReady certification list, including Raspberry Pi 4 Model B and the note that certification does not imply OS vendor support. https://www.arm.com/architecture/system-architectures/systemready-compliance-program/systemready-past-certifications
- GNU `dd` manual on `status=progress` and `conv=fsync`, checked locally with `man dd`.
- GNU Parted help for `resizepart` and `--script`, checked locally with `parted --help`.

## Issues Found
- The post claimed Red Hat provides an aarch64 image that can run directly on Raspberry Pi 4. Changed this to clarify that Red Hat provides RHEL for ARM 64, but not a Raspberry Pi 4-specific SD card image.
- The download instructions recommended the KVM Guest Image or a raw Raspberry Pi image. Changed this to recommend the ARM64 Boot ISO or Binary DVD ISO and explicitly warn not to write the KVM Guest Image directly to a Raspberry Pi SD card.
- The `dd` command used a KVM guest image as SD-card input. Changed the example to write an ARM64 installer ISO to a USB installer device.
- The root partition expansion instructions assumed a fixed partition number and interactive `parted` behavior. Updated the command to use `parted --script` and clarify that the partition number must match the actual root partition.
- The first-boot section implied default root credentials. Changed this because Red Hat documents KVM guest images with a locked root password and `cloud-user`/cloud-init behavior, while installer-based systems create credentials during installation.
- The post described the result as a fully supported enterprise Linux environment. Changed this to state that Raspberry Pi 4 use is experimental unless the hardware and boot environment are covered by Red Hat's RHEL for ARM 64 support requirements.
- The Wi-Fi section implied firmware installation is sufficient. Changed this to clarify that Wi-Fi support depends on firmware and driver availability for the running kernel.

## Review Notes
The corrected post is still a high-level experimental guide rather than a fully reproducible Red Hat-supported Raspberry Pi installation procedure. A future revision should either target certified ARM hardware or add a separately verified Raspberry Pi UEFI firmware workflow with explicit support caveats.
