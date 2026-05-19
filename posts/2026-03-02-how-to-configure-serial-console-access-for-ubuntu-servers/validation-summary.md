# Validation Summary: How to Configure Serial Console Access for Ubuntu Servers

## Status
validated

## Post Type
Tutorial / server administration guide

## Technologies Covered
- Ubuntu Linux
- Linux serial console kernel parameters
- GNU GRUB serial terminal configuration
- systemd getty and serial-getty units
- agetty
- IPMI Serial Over LAN with ipmitool
- Dell iDRAC RACADM
- AWS EC2 Serial Console
- KVM/QEMU and libvirt
- conserver console logging

## Sources Consulted
- Linux kernel documentation: Serial Console: https://docs.kernel.org/admin-guide/serial-console.html
- Linux kernel documentation: Kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- GNU GRUB Manual: Simple configuration: https://www.gnu.org/software/grub/manual/grub/html_node/Simple-configuration
- GNU GRUB Manual: serial command: https://www.gnu.org/software/grub/manual/grub/html_node/serial.html
- Local systemd manpage: systemd-getty-generator(8)
- Local agetty manpage: agetty(8)
- Local systemd unit files: /lib/systemd/system/getty@.service and /lib/systemd/system/serial-getty@.service
- ipmitool manpage: https://man.he.net/man1/ipmitool
- AWS EC2 Serial Console documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-serial-console.html
- AWS EC2 Serial Console access configuration: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-access-to-serial-console.html
- AWS EC2 Serial Console connection documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-serial-console.html
- libvirt domain XML documentation: https://www.libvirt.org/formatdomain
- libvirt virsh documentation: https://www.libvirt.org/manpages/virsh.html
- conserver.cf manual: https://www.conserver.com/docs/conserver.cf.man.html
- Dell iDRAC RACADM documentation: https://www.dell.com/support/manuals/

## Issues Found
- The `ipmitool sol set baud-rate 115200` example used a parameter/value form that is not valid for IPMI 2.0 SOL in ipmitool. Changed it to `non-volatile-bit-rate 115.2` and `volatile-bit-rate 115.2`.
- The remote `ipmitool sol activate` example omitted `-I lanplus`, which is the normal IPMI 2.0 LAN interface for remote SOL. Added it.
- The Dell RACADM example used `iDRAC.SerialCapture`, which relates to captured serial data rather than checking serial communication settings. Replaced it with `BIOS.SerialCommSettings` and `iDRAC.Serial`.
- The dual-console comment incorrectly implied the video terminal was primary when `console=ttyS1` was the last console argument. Updated the comment to state that `ttyS1` becomes `/dev/console`.
- The video getty example used `serial-getty@tty1.service`; virtual consoles use `getty@tty1.service`. Corrected the unit name.
- The AWS EC2 section used `enaSrdSpecification`, which is unrelated to EC2 Serial Console, and incorrectly said an EC2 Instance Connect Endpoint is required. Replaced it with `get-serial-console-access-status`, `enable-serial-console-access`, and the Linux `serial-getty@ttyS0.service` setup.
- The conserver example configured IPMI SOL as `type host` with `protocol ipmi`, but conserver documents IPMI SOL as `type ipmi` with host and authentication fields. Updated the example accordingly.

## Review Notes
- Ubuntu systems using systemd may automatically start `serial-getty@.service` for serial consoles listed on the kernel command line, but explicitly enabling the service is still a valid administrative step.
- Exact SOL serial port and baud rate vary by server platform and BIOS/BMC settings, so the post correctly tells readers to verify against server documentation.
