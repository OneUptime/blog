# How to Boot from an Older Kernel When the Current Kernel Fails on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, GRUB, Boot, Recovery, Linux

Description: Learn how to boot from an older kernel on RHEL when the current kernel fails, and how to set the default kernel version.

---

RHEL keeps multiple kernel versions installed. When a kernel update causes boot failures, hardware incompatibility, or application issues, you can boot from an older kernel through the GRUB menu.

## Prerequisites

- Physical or console access to the RHEL system
- At least two kernels installed

## Selecting an Older Kernel at Boot

1. Reboot the system
2. When the GRUB menu appears, select the older kernel from the list
3. Press Enter to boot

If the GRUB menu does not appear, press `Esc` or hold `Shift` during early boot to display it.

## Listing Installed Kernels

From a running system, list installed kernels:

```bash
sudo grubby --info=ALL | grep -E "^kernel|^title"
```

Or use rpm:

```bash
rpm -q kernel kernel-core
```

View the GRUB menu entries:

```bash
sudo grubby --info=ALL
```

## Setting the Default Kernel

After booting into a working older kernel, set it as the default:

```bash
# List available kernels with their index
sudo grubby --info=ALL | grep -E "^index|^kernel"
```

Set default by index:

```bash
sudo grubby --set-default-index=1
```

Set default by kernel path:

```bash
sudo grubby --set-default=/boot/vmlinuz-5.14.0-284.el9.x86_64
```

Verify the default:

```bash
sudo grubby --default-kernel
```

## Removing a Broken Kernel

If the new kernel is confirmed broken, remove it:

```bash
sudo dnf remove kernel-5.14.0-362.el9.x86_64 kernel-core-5.14.0-362.el9.x86_64
```

Verify removal:

```bash
rpm -q kernel
```

## Preventing Automatic Kernel Updates

Temporarily exclude kernel updates:

```bash
sudo dnf upgrade --exclude=kernel*
```

Permanently exclude in dnf configuration:

```bash
echo "exclude=kernel*" | sudo tee -a /etc/dnf/dnf.conf
```

Remove the exclusion when you are ready to update:

```bash
sudo sed -i '/^exclude=kernel/d' /etc/dnf/dnf.conf
```

## Configuring the Number of Kept Kernels

RHEL keeps 3 kernels by default. Change this in `/etc/dnf/dnf.conf`:

```bash
# Keep 5 kernels
echo "installonly_limit=5" | sudo tee -a /etc/dnf/dnf.conf
```

## Editing GRUB Entries for Troubleshooting

At the GRUB menu, press `e` to edit a kernel entry. You can add kernel parameters for debugging:

- `systemd.unit=rescue.target` - Boot to rescue mode
- `systemd.unit=emergency.target` - Boot to emergency mode
- `rd.break` - Break into initramfs shell
- `single` or `1` - Single user mode
- `nomodeset` - Disable graphics drivers

Press Ctrl+X to boot with the modified parameters.

## Checking Why a Kernel Failed

After booting into a working kernel, check logs from the failed boot:

```bash
sudo journalctl --boot=-1
```

If the failed boot did not log (crash), check:

```bash
sudo journalctl --list-boots
```

## Conclusion

RHEL makes it easy to fall back to an older kernel when the current one fails. Use the GRUB menu to select a working kernel, then set it as the default with grubby. Keep multiple kernels installed as a safety net and investigate the failing kernel before removing it.
