# Why a sysfs Attribute Exists on One Kernel but Not Another

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Hardware, Troubleshooting

Description: Diagnose missing sysfs attributes by comparing device identity, kernel configuration, driver binding, and feature visibility.

A sysfs attribute missing after a kernel upgrade is not automatically a removed feature. The new kernel may have a different configuration, a different driver may have bound, probe may have failed, or the hardware may not satisfy the condition that makes the attribute visible.

Compare the two systems in layers. Establish that they represent the same device and interface before comparing filenames or changing kernel settings.

## Confirm the device and namespace

Capture the running release and resolve the current device:

```bash
uname -r
udevadm info --query=property --path=/sys/class/leds/example:green:status
readlink -e /sys/class/leds/example:green:status
```

Use an observed path for your subsystem. A class name may change across boots, especially when it includes an enumeration number. Match serial, vendor/product identity, or physical topology according to your application's identity requirement.

Compare the host and the affected service or container. A missing file inside one namespace may reflect a restricted mount, while the host still exposes the attribute. That calls for an access investigation rather than a kernel rebuild.

Also distinguish an absent device from an absent optional attribute. If the device directory is gone, start with enumeration and probe. If only one file is missing, focus on interface registration and visibility.

## Find the expected ABI

Search the kernel ABI documentation by filename and surrounding subsystem path. Read the conditions, not just the date an entry was introduced. An ABI can be documented while depending on specific device capabilities or a particular mode.

For example, PCI `reset` is exposed for devices with appropriate reset support. The existence of that attribute on another PCI function does not imply that every function must provide it. [Kernel PCI ABI documentation](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)

Linux distinguishes documented interfaces and their stability categories. Internal source interfaces are a separate matter. Avoid concluding that a change in a C callback or structure proves the userspace ABI changed. [Linux ABI documentation](https://docs.kernel.org/admin-guide/abi.html)

## Compare the running configuration

Use the configuration for the running kernel, not a newly installed kernel that has not been booted. Many distributions provide a file under `/boot`; some kernels expose a compressed configuration through `/proc/config.gz`.

```bash
config_file=/boot/config-$(uname -r)
rg 'CONFIG_SYSFS=|CONFIG_EXAMPLE_DRIVER=|CONFIG_PM=' "$config_file"
```

`CONFIG_EXAMPLE_DRIVER` is a placeholder for the symbol found in the driver's Kconfig. If this configuration location is unavailable, use the distribution's supported source for the exact build configuration.

For a tristate option, `y` generally means built in, `m` means available as a module, and unset means excluded. Dependencies can prevent a feature from being selected or compiled. A driver can also have optional feature symbols separate from the main driver symbol. [Kernel Kconfig language](https://docs.kernel.org/kbuild/kconfig-language.html)

Do not infer missing support solely from `lsmod`: a built-in driver does not need to appear as a loaded module.

## Verify binding and probe success

At the relevant canonical device, inspect the actual links:

```bash
device=/sys/bus/pci/devices/0000:03:00.0
readlink -e "$device/driver"
readlink -e "$device/driver/module"
cat "$device/modalias"
journalctl -k -b
```

The address is illustrative. Look for a failed probe, missing firmware, unavailable resources, deferred initialization, or a different bound driver. A module being loaded only proves that its code is present; it does not prove that this device successfully bound to it.

A `modalias` can help identify candidates, but the bound driver link is stronger evidence of the actual binding. Driver matching and probe are distinct stages. [Kernel driver binding documentation](https://docs.kernel.org/driver-api/driver-model/binding.html)

## Trace visibility in source

In source matching each kernel, search the attribute and its group:

```bash
rg -n 'example_attribute|is_visible|is_bin_visible' drivers/example
rg -n 'CONFIG_|IS_ENABLED|dev_groups|attribute_group' drivers/example
```

Visibility callbacks can hide an attribute or make it read-only based on capabilities. Other controls appear only after a feature is enabled. LED trigger-specific attributes, for example, can depend on the selected trigger. [Kernel LED class documentation](https://docs.kernel.org/leds/leds-class.html)

Compare hardware revision, firmware, active mode, and optional dependencies alongside the code. A source-level feature may exist in both kernels while the capability check produces a different result because probe detected different hardware state.

## Build a focused comparison

Create a small table containing kernel package version, relevant config symbols, canonical device identity, bound driver, firmware version when available, and attribute presence. Change one factor at a time on a test system.

If the older kernel exposes the attribute on the same hardware and the newer one does not, inspect the distribution patch history and upstream commits affecting its registration. A backported feature can make version-number assumptions unreliable.

Do not try to repair an absent attribute with `touch`, permissions, or a directory symlink. Userspace cannot manufacture the kernel callback behind a sysfs file. Restore the required driver/configuration state, use the supported replacement interface, or report a reproducible regression with the comparison evidence.

## Conclusion

A missing sysfs file is a discovery problem until its creation conditions are known. Compare device identity and namespace, then configuration, binding, and visibility logic. That sequence distinguishes an intentional capability difference from a failed probe or a real ABI regression.

## Official Documentation

- [Linux kernel: ABI descriptions](https://docs.kernel.org/admin-guide/abi.html)
- [Linux kernel: Kconfig](https://docs.kernel.org/kbuild/kconfig-language.html)
- [Linux kernel: driver binding](https://docs.kernel.org/driver-api/driver-model/binding.html)
- [Linux kernel: PCI optional attributes](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)
- [Linux kernel: LED trigger attributes](https://docs.kernel.org/leds/leds-class.html)
