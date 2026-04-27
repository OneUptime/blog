# Validation Summary: How to Configure Per-Application IPv4 Bandwidth Limits with cgroups and tc

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux cgroups v1 (`net_cls` controller)
- Linux Traffic Control (`tc`) — HTB qdisc, cgroup classifier, u32 classifier
- IFB (Intermediate Functional Block) device for ingress shaping
- `cgroup-tools` (`cgexec`)
- `iperf3` for bandwidth verification

## Sources Consulted
- `tc-cgroup(8)` man page from iproute2 (https://man7.org/linux/man-pages/man8/tc-cgroup.8.html)
- `tc(8)` man page (https://man7.org/linux/man-pages/man8/tc.8.html)
- Linux kernel admin-guide: `Documentation/admin-guide/cgroup-v1/net_cls.rst` (https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/net_cls.html)
- Linux kernel admin-guide: `Documentation/admin-guide/cgroup-v2.rst` (https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- iproute2 source for `cls_cgroup` (verified syntax via `tc filter add ... cgroup help`)
- Bash reference manual on line continuation behavior

## Issues Found
1. **Description claimed cgroups v2** — the post described using "Linux cgroups (v2) … or net_cls", but `net_cls` is a cgroup v1-only controller. Cgroup v2 has no `net_cls` and uses eBPF (`BPF_CGROUP_INET_*`) for network filtering. Updated the description to say "cgroups (v1) … net_cls controller".

2. **`net_cls.classid` value did not map to the defined tc class** — the post wrote `0x00100001` (which encodes to tc classid `16:1`) but the HTB class was created as `classid 1:1`. Per the kernel net_cls documentation, the encoding is `0xMMMMmmmm` where MMMM is the major and mmmm is the minor (both hex). Traffic from the cgroup would have been classified to a non-existent class `16:1` and fallen through to the default. Changed the value to `0x00010001` and updated the comment.

3. **Inline comments after backslash line continuation** — bash only treats `\` as a newline-escape when it is the **last** character on the line. The post had:
   ```
   rate 10mbit \     # Guaranteed bandwidth
   ```
   The `\` here is followed by spaces and a `#`, so the line does not continue and the next line runs as a separate (broken) command. Verified by execution. Moved the comment above the command.

4. **Incorrect `tc filter ... cgroup` syntax** — the post used `handle 0x00100001 cgroup classid 1:1`. The `cls_cgroup` classifier accepts neither `handle` nor `classid`; per `tc-cgroup(8)` its only options are `[ match EMATCH_TREE ] [ action ACTION_SPEC ]`. The destination class is read directly from `net_cls.classid` in the source process's cgroup. Replaced with the correct form: `protocol ip prio 10 cgroup`.

5. **Cgroup classifier on ingress (IFB) cannot work** — the `tc-cgroup(8)` man page is explicit: "useful for locally generated packets only". On the ingress hook, the skb has not been delivered to a local socket yet, so it has no associated cgroup and the classifier cannot match. The original post's IFB section attached a cgroup filter on `ifb0`, which would silently fail to classify any traffic. Replaced the cgroup filter on `ifb0` with a `u32` classifier matching destination port (a working pattern for per-application ingress shaping) and added a paragraph explaining the caveat. Also added the missing `handle ffff:` to `tc qdisc add dev eth0 ingress` to make the ingress qdisc deletable by handle (the cleanup `tc qdisc del dev eth0 ingress` continues to work either way).

## Review Notes
- On modern distributions that boot with `systemd.unified_cgroup_hierarchy=1` (the default for most distros now), `/sys/fs/cgroup` is a single cgroup v2 mount and the `mount -t cgroup -o net_cls …` command will only succeed if (a) v2 is disabled or (b) net_cls is mounted under a different path. The post does not call this out; on a v2-only system the user will need to mount net_cls somewhere outside `/sys/fs/cgroup` (e.g., `/mnt/net_cls`) or boot with `cgroup_no_v1=net_cls` cleared and a non-unified hierarchy.
- The `net_cls` and `net_prio` controllers have been deprecated for cgroup v2; long-term, equivalent functionality is best implemented with eBPF programs of type `BPF_PROG_TYPE_CGROUP_SKB` attached via `bpftool` or `tc filter ... bpf`. A future revision could mention this migration path.
- HTB without `burst`/`cburst` parameters uses kernel-defaulted burst sizes; for very tight rate-limits, callers may want to specify them explicitly. Not a bug, just a tunable.
- Adding the application PID via `tasks` (cgroup v1) is correct, though `cgroup.procs` is generally preferred for adding the entire thread group at once. The post's choice still works.
