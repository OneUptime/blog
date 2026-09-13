# Decode a USB-over-PCI sysfs Path from Controller to Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, USB, Hardware, Kernel

Description: Read PCI domain, bus, device, and function fields alongside USB bus numbers, hub port chains, configurations, and interfaces.

A sysfs path can describe several buses at once. The first address may identify a PCI USB controller, while later names identify a USB root hub, a downstream port chain, and a specific USB interface. Reading the whole path as one address leads to mistakes such as unbinding the controller when you meant to inspect one adapter.

Consider this illustrative path:

```text
/sys/devices/pci0000:00/0000:00:14.0/usb1/1-2/1-2.3/1-2.3:1.0
```

It represents an example topology, not hardware guaranteed to exist on your machine. Each component contributes a different piece of information.

## Decode the PCI address first

`pci0000:00` names a root PCI bus in domain `0000`, bus `00`. The component `0000:00:14.0` uses the PCI domain, bus, device, and function convention. Domain, bus, and device fields are hexadecimal; the final field identifies the function.

Here the controller is function zero of device `14` on bus `00` in domain `0000`. The device field is sometimes called a slot in command output, but it is not a reliable label for a physical chassis slot. Firmware slot labels and hotplug slots are separate information. [Kernel PCI sysfs documentation](https://docs.kernel.org/PCI/sysfs-pci.html)

Inspect an observed controller without writing anything:

```bash
controller=/sys/bus/pci/devices/0000:00:14.0
cat "$controller/vendor"
cat "$controller/device"
cat "$controller/class"
readlink -e "$controller/driver"
```

Use `lspci -s 0000:00:14.0 -nnk` when pciutils is installed to combine identification and driver information. More complex machines can include several PCI bridge components before reaching the USB controller; do not assume every controller sits directly below the root bus.

## Read the USB topology components

For the sample path:

| Component | Meaning in this example |
|---|---|
| `usb1` | Root hub for USB bus 1 |
| `1-2` | Device connected to root-hub port 2 on bus 1 |
| `1-2.3` | Device behind port 3 of the hub at `1-2` |
| `1-2.3:1.0` | Configuration 1, interface 0 on that USB device |

The part before the colon identifies the USB device's port route. The suffix identifies configuration and interface, not an endpoint. An endpoint is another USB concept, with its own address and transfer characteristics. Kernel USB core code constructs device and interface names using these separate identifiers. [USB device naming source](https://github.com/torvalds/linux/blob/master/drivers/usb/core/usb.c), [USB interface naming source](https://github.com/torvalds/linux/blob/master/drivers/usb/core/message.c)

Do not confuse the bus number or port route with the USB device address printed by `lsusb` as `Device 005`. That address can change when the device reconnects. Bus numbers can change too, so this decoding explains current topology rather than establishing a permanent serial identity.

## Verify the attributes at each level

Inspect the USB device and interface separately:

```bash
usb_device=/sys/bus/usb/devices/1-2.3
usb_interface=/sys/bus/usb/devices/1-2.3:1.0
cat "$usb_device/busnum"
cat "$usb_device/devnum"
cat "$usb_device/devpath"
cat "$usb_device/idVendor"
cat "$usb_device/idProduct"
cat "$usb_interface/bInterfaceNumber"
cat "$usb_interface/bInterfaceClass"
readlink -e "$usb_interface/driver"
```

These addresses are illustrative; replace them with entries from your own `/sys/bus/usb/devices`. Some descriptors, including serial strings, are optional. A missing serial file is not evidence that enumeration failed.

A composite USB device can expose several interfaces, such as a modem control interface and a network interface, with different drivers. Ordinary USB function drivers generally bind to interfaces, while the USB core represents the device and its configuration separately. [Linux USB host-side API documentation](https://www.kernel.org/doc/html/latest/driver-api/usb/usb.html)

That distinction explains why a driver link on the interface can be the one you need even when the device directory shows a more generic owner.

## Trace from a convenient class name

An application may begin with `/dev/ttyUSB0` or a network interface rather than a USB address. Use `udevadm info` for a device node, or resolve an observed class entry, then walk its canonical ancestors. Select the USB and PCI ancestors by their subsystem links.

Avoid hard-coding a rule such as three parents up is the controller. Intermediate devices can differ by driver, kernel, and hardware. Preserve each ancestor's identity independently so the inventory still explains the path after an additional hub is inserted.

## Use topology to assess impact

Before considering a maintenance operation, identify the scope. A PCI controller can serve several USB root hubs and many peripherals. A hub can serve multiple downstream devices. A composite peripheral can have interfaces used by different applications.

A read-only topology report is useful evidence for deciding which object belongs in a later operation. It does not prove that unbinding any particular layer is safe. Record the path together with physical port labels and device serials when available, then confirm which application depends on each interface.

## Conclusion

Decode a USB-over-PCI path as a chain of distinct addresses: PCI controller, USB root bus, downstream ports, and configuration/interface. Verify the interpretation with attributes at the matching device level. This gives a precise description of present topology while keeping persistent identity and operational impact separate.

## Official Documentation

- [Linux kernel: PCI sysfs](https://docs.kernel.org/PCI/sysfs-pci.html)
- [Linux kernel: USB host-side API](https://www.kernel.org/doc/html/latest/driver-api/usb/usb.html)
- [Linux kernel: USB device naming](https://github.com/torvalds/linux/blob/master/drivers/usb/core/usb.c)
- [Linux kernel: USB interface naming](https://github.com/torvalds/linux/blob/master/drivers/usb/core/message.c)
