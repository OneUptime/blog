# Validation Summary: How to Understand /sys File System on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux kernel sysfs (/sys virtual filesystem)
- Ubuntu Linux
- Block device interfaces (/sys/block, queue parameters, schedulers)
- Network device interfaces (/sys/class/net, statistics, RPS)
- Input device interfaces (/sys/class/input)
- PCI bus interfaces (/sys/bus/pci)
- USB device interfaces (/sys/bus/usb)
- Kernel modules (/sys/module)
- CPU frequency scaling (cpufreq) and CPU hotplug
- NUMA topology, huge pages, transparent huge pages (THP)
- Power management (/sys/power)
- LED class devices (/sys/class/leds)
- Bash scripting

## Sources Consulted
- Linux kernel sysfs documentation: https://www.kernel.org/doc/html/latest/filesystems/sysfs.html
- Linux kernel ABI stable docs (sysfs-block, sysfs-class-net): https://www.kernel.org/doc/html/latest/admin-guide/abi-stable.html
- Linux kernel cpufreq docs: https://www.kernel.org/doc/html/latest/admin-guide/pm/cpufreq.html
- Linux kernel CPU hotplug docs: https://www.kernel.org/doc/html/latest/core-api/cpu_hotplug.html
- Linux kernel Transparent HugePages docs: https://www.kernel.org/doc/html/latest/admin-guide/mm/transhuge.html
- Linux kernel HugeTLB docs: https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html
- Linux kernel LED class docs (Documentation/leds/leds-class.rst)
- Linux kernel power management docs: https://www.kernel.org/doc/html/latest/power/states.html
- `lspci` man page (PCI BDF/slot.function notation)
- Redis admin guide (THP recommendations): https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- MongoDB documentation on Transparent Huge Pages: https://www.mongodb.com/docs/manual/tutorial/transparent-huge-pages/
- Live verification against an Ubuntu system's actual /sys hierarchy

## Issues Found
1. **Transparent Huge Pages "disable" command was incorrect**
   - **Was:** `echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled` under a comment saying "Disable transparent huge pages (common for databases like Redis/MongoDB)".
   - **Problem:** Writing `madvise` does not disable THP. It only restricts THP to processes that explicitly request it via `madvise(MADV_HUGEPAGE)`. The official Redis and MongoDB documentation both recommend `never` to genuinely disable THP for those workloads.
   - **Fix:** Changed the value from `madvise` to `never`, which truly disables THP and matches the stated intent and the Redis/MongoDB recommendations.

## Review Notes
- The PCI BDF notation `domain:bus:slot.function` is the form used by `lspci` and matches the post's description; kernel ABI docs sometimes use "device" instead of "slot" but both are accepted in common Linux usage.
- The claim that "cpu0 cannot be taken offline" is accurate for the default x86_64 Ubuntu kernel — verified that `/sys/devices/system/cpu/cpu0/online` is not present (writable) on a stock Ubuntu install. On some architectures or kernels with `CONFIG_BOOTPARAM_HOTPLUG_CPU0`, cpu0 can be offlined, but the default-Ubuntu statement is correct.
- The `platform::backlight` example under LEDs is illustrative; not all systems expose the backlight via `/sys/class/leds/`. Many laptops expose backlight under `/sys/class/backlight/` instead. The post uses it only as a sample and notes "where permitted", which is acceptable.
- The example PCI address `0000:00:1f.3` in the wake-up section is illustrative (commonly Intel HD Audio on many platforms); actual addresses vary per system, but the path layout and the `power/wakeup` attribute are correct.
- The hardware inventory script uses `[[ "$name" == loop* ]]` to skip loop devices, which is appropriate given Ubuntu's heavy use of loopback-mounted snaps.
- The `awk '{printf "%.0f GB", $1*512/1024/1024/1024}'` computation uses decimal GB (10^9-style binary math here is actually 2^30 since divisors are 1024). This will report capacities that match typical Linux tools rather than vendor "GB" markings; this is the conventional approach and not an error.
