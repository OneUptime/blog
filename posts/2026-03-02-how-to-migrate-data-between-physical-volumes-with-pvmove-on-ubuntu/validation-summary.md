# Validation Summary: How to Migrate Data Between Physical Volumes with pvmove on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LVM2 (Logical Volume Manager)
- `pvmove` command
- `pvs`, `pvdisplay`, `pvcreate`, `pvremove`
- `lvs`, `lvdisplay`
- `vgextend`, `vgreduce`
- `ionice` and `iostat` for I/O management
- `dmeventd` (device-mapper event daemon)
- Ubuntu Linux

## Sources Consulted
- LVM2 official documentation and `pvmove(8)` man page (https://man7.org/linux/man-pages/man8/pvmove.8.html)
- `lvs(8)` man page — for `copy_percent`, `devices`, `seg_pe_ranges` reportable fields
- `pvdisplay(8)` man page — for `-m` segment mapping output
- `dmeventd(8)` man page — verified that `-d` flag controls debug verbosity, not status checking
- `ionice(1)` man page — verified `-c 3` (idle class) and `-p PID` syntax
- Red Hat / Ubuntu LVM administration guides for pvmove workflow and PE size defaults

## Issues Found

**Issue 1: Incorrect command for checking dmeventd status**

In the "pvmove seems stuck" troubleshooting section, the post used:

```bash
sudo dmeventd -d  # Check dmeventd is active
```

This is incorrect. The `-d` flag for `dmeventd` controls debug verbosity, and invoking `dmeventd` directly attempts to start a new daemon instance — it does not check whether one is currently running. Replaced with:

```bash
pgrep -a dmeventd  # Check dmeventd process is running
```

`pgrep -a dmeventd` correctly checks for a running `dmeventd` process and prints its command line if active.

## Review Notes

The post is otherwise technically accurate. Verified items:

- `pvmove SourcePV` migrates all extents off the named PV — correct.
- `pvmove SourcePV DestPV` targets a specific destination — correct.
- `pvmove -n LVname SourcePV` moves only the named LV's extents — correct (`-n`/`--name` is the documented flag).
- `pvmove SourcePV:PE_start-PE_end` syntax for extent ranges — correct.
- `pvmove -b` runs in background — correct.
- `pvmove --abort` aborts in-progress moves; already-migrated extents stay at destination (default, non-atomic mode) — correct.
- Running `pvmove` with no arguments resumes an interrupted operation — correct per man page.
- 4 MiB default Physical Extent size, so 2048 PEs = 8 GiB — arithmetic correct.
- `lvs -a -o lv_name,copy_percent` shows pvmove progress via the temporary mirror LV — correct.
- `lvs -o lv_name,devices,seg_pe_ranges` — both fields are valid lvs reportable fields.
- `pvdisplay -m` shows the per-extent segment map — correct.
- `ionice -c 3` (idle class) and `ionice -c 3 -p <PID>` for an existing process — correct ionice usage.
- Full disk replacement workflow (`pvcreate` → `vgextend` → `pvmove` → `vgreduce` → `pvremove`) — correct and complete.

Minor stylistic observation (not changed): the rough heuristic "5-15 minutes per 100GB on spinning disks" varies widely with disk speed, fragmentation, and concurrent I/O, but is reasonable as a ballpark for readers planning maintenance windows.
