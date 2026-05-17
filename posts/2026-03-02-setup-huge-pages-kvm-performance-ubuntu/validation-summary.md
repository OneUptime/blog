# Validation Summary: How to Set Up Huge Pages for KVM Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel memory management (huge pages, Transparent Huge Pages)
- hugetlbfs
- sysctl / sysfs tunables (`vm.nr_hugepages`, `/sys/kernel/mm/hugepages/`, `/sys/kernel/mm/transparent_hugepage/`)
- GRUB kernel command-line parameters (`hugepagesz`, `hugepages`, `transparent_hugepage`)
- libvirt domain XML (`<memoryBacking>`, `<hugepages>`, `<locked/>`, `<source type='memfd'/>`, `<access mode='shared'/>`, `<numatune>`)
- QEMU/KVM
- `virsh` CLI
- systemd unit files / rc.local
- `mbw` memory bandwidth benchmark
- `perf stat` with `dTLB-load-misses` / `dTLB-store-misses` events
- `/proc/meminfo`, `/proc/PID/status`, `/proc/PID/numa_maps`, `/proc/buddyinfo`

## Sources Consulted
- Linux kernel admin docs — Transparent Hugepage Support: https://www.kernel.org/doc/Documentation/admin-guide/mm/transhuge.rst
- Linux kernel admin docs — HugeTLB Pages: https://www.kernel.org/doc/Documentation/admin-guide/mm/hugetlbpage.rst
- Linux kernel `/proc` filesystem docs: https://www.kernel.org/doc/Documentation/filesystems/proc.rst
- libvirt domain XML format — memory backing: https://libvirt.org/formatdomain.html#memory-backing
- QEMU monitor docs: https://www.qemu.org/docs/master/system/monitor.html
- QEMU `hmp-commands-info.hx` source (for `info kvm` semantics)
- Live verification on the host:
  - `ls /sys/kernel/mm/transparent_hugepage/` (sysfs entries exist)
  - `ls /proc/sys/kernel/mm/transparent_hugepage/` (no such sysctl path)
  - `cat /proc/buddyinfo` (confirmed no `hugepages` token)
  - `grep -i huge /proc/self/status` (confirmed field name is `HugetlbPages`)

## Issues Found
1. **Bogus THP sysctl section.** The post claimed THP could be persisted via `kernel.mm.transparent_hugepage.enabled = madvise` in `/etc/sysctl.d/`, "on kernel 5.15+". This is not true: THP is exposed only via sysfs (`/sys/kernel/mm/transparent_hugepage/`), not via the sysctl/`/proc/sys/` tree, and writing those sysctl keys is a no-op (or an error). Replaced this block with the actual canonical persistence approaches: the `transparent_hugepage=` kernel boot parameter (for the top-level mode only) and a one-shot systemd unit (for `defrag` and other knobs that have no boot-parameter equivalent).
2. **Missing `chmod +x /etc/rc.local`.** On modern Ubuntu, the rc.local script will not run unless it is executable (and the `rc-local.service` shim is present). Added the `chmod +x` step.
3. **`grep HugePages` against `/proc/PID/status` does not match.** The actual field in `/proc/PID/status` is `HugetlbPages` (lowercase `tlb` segment), so a case-sensitive grep for `HugePages` returns nothing. Changed to `grep -i huge`, which matches `HugetlbPages` reliably. Also added a `/proc/PID/numa_maps` line for per-mapping/NUMA breakdown, which is the more informative view of actual hugepage backing.
4. **`virsh ... "info kvm"` mislabeled.** The post said this command verifies "if VM is actually using huge pages". The QEMU HMP `info kvm` command only reports whether KVM acceleration is enabled (it is the HMP wrapper around `query-kvm`, which only returns `enabled`/`present` booleans). Re-labeled the comment to reflect what the command actually does.
5. **`grep -i hugepages /proc/buddyinfo` matches nothing.** `/proc/buddyinfo` reports free-page counts per buddy order per zone; the string "hugepages" never appears in it. Replaced with a plain `cat /proc/buddyinfo` plus a comment explaining how to read the columns (orders 0..10, with order 9 = 2 MB chunks on x86_64) to spot fragmentation that would block huge-page allocation.

## Review Notes
- The phrasing "a 4 GB VM requires over 1 million TLB entries" is technically imprecise (TLBs are caches with a fixed, small entry count — the VM has ~1M page-table entries, only a tiny fraction of which the TLB can cache at any time). Left as-is since the intent and the magnitude of the TLB-pressure argument are clear, and rewriting would be a stylistic change rather than a correctness fix.
- The `<source type='memfd'/>` + `<access mode='shared'/>` configuration is valid (libvirt 4.10.0+, QEMU 5.0+) and works with `<hugepages>` via `memfd_create(MFD_HUGETLB)`. However, it bypasses the hugetlbfs mount the post earlier sets up — for purely local VMs the simpler default (`<source type='file'/>`, which uses the hugetlbfs mount) would be more consistent. Not changed because the chosen form is correct and is what's needed if the user later moves to vhost-user or shared-memory devices.
- The 1 GB GRUB line `hugepagesz=1G hugepages=8` correctly relies on the `hugepagesz=` directive to set the size context for the immediately-following `hugepages=` value. If users add more `hugepages=` lines without re-stating `hugepagesz=`, behavior depends on the default huge page size — worth being aware of when extending the example.
- `mbw -n 5 1000` runs five iterations on a 1000 MiB buffer (mbw's size argument is MiB, not GB despite the inline comment). Left the comment as a harmless approximation since "1 GB" rounds correctly enough at this scale.
