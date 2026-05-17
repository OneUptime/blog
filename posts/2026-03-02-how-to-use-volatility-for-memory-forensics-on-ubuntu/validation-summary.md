# Validation Summary: How to Use Volatility for Memory Forensics on Ubuntu

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Volatility 3 (memory forensics framework)
- LiME (Linux Memory Extractor)
- Ubuntu Linux
- libvirt / virsh (VM memory dump)
- YARA (signature scanning)
- Python 3 / pip / venv
- Standard Linux utilities (strings, grep, sha256sum, dd)

## Sources Consulted
- Volatility 3 official GitHub repository: https://github.com/volatilityfoundation/volatility3
- Volatility 3 Linux plugin source files in `volatility3/framework/plugins/linux/` (pslist.py, pstree.py, psaux.py, lsof.py, bash.py, lsmod.py, proc.py, ip.py, sockstat.py, check_modules.py, vmayarascan.py)
- Volatility 3 framework-level yarascan plugin: https://github.com/volatilityfoundation/volatility3/blob/develop/volatility3/framework/plugins/yarascan.py
- Volatility 3 documentation: https://volatility3.readthedocs.io/
- LiME GitHub repository: https://github.com/504ensicsLabs/LiME

## Issues Found

1. **Non-existent plugin `linux.netstat.Netstat`** — Volatility 3 does not ship a `netstat` plugin. The correct Linux plugin for enumerating network sockets is `linux.sockstat.Sockstat` (file `sockstat.py`, class `Sockstat`). Replaced both occurrences (analysis section and the automation script).

2. **Non-existent plugin `linux.ifconfig.Ifconfig`** — Volatility 3 does not ship an `ifconfig` plugin. Network interface enumeration is done via `linux.ip.Addr` (class `Addr` in `ip.py`). Replaced.

3. **Incorrect class capitalization `linux.check_modules.CheckModules`** — The actual class is `Check_modules` (snake_case with leading capital), not `CheckModules`. Plugin paths are case-sensitive, so the original would fail to load. Fixed both occurrences (analysis section and the automation script).

4. **Non-existent plugin `linux.proc_maps.ProcMaps`** — There is no `proc_maps.py` in Volatility 3. The correct plugin for listing/dumping process memory maps is `linux.proc.Maps` (file `proc.py`, class `Maps`), which is in fact already used earlier in the post for fileless-malware hunting. The `--pid` and `--dump` flags are supported by this plugin. Replaced.

5. **Wrong YARA flag `--yara-rules`** — The framework `yarascan.YaraScan` plugin does not accept `--yara-rules`. The actual command-line options are `--yara-file`, `--yara-string`, and `--yara-compiled-file`. Replaced both YARA invocations with `--yara-file`.

## Review Notes

- `linux.check_modules.Check_modules` is currently deprecated and scheduled for removal on 2026-06-07; the replacement lives at `linux.malware.check_modules.Check_modules`. The deprecated path still functions today, so the minimal fix (capitalization) was applied. Readers running Volatility 3 after the removal date may need to swap in the new namespace.
- `yarascan.YaraScan` scans the kernel memory layer. For scanning the virtual memory of Linux user-space processes specifically, the more targeted plugin is `linux.vmayarascan.VmaYaraScan` (which inherits the same YARA option set). The framework-level plugin used in the post is still valid; this is informational, not an error.
- The LiME insmod command parameters (`path=...`, `format=lime`) are correct.
- The `virsh dump --memory-only` command is correct for libvirt/KVM memory acquisition.
- The advice that modern kernels restrict `/dev/mem` (via `CONFIG_STRICT_DEVMEM`) is accurate.
- The `python3 vol.py --help` verification works when run from inside the cloned `volatility3` directory after activating the venv.
