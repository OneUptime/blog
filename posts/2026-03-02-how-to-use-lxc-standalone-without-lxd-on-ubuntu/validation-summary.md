# Validation Summary: How to Use LXC (Standalone) Without LXD on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXC (Linux Containers) standalone tools (`lxc-*` command suite)
- LXC container templates (ubuntu, debian, alpine, download)
- LXC configuration file format (`lxc.*` keys)
- cgroup v1 and cgroup v2 resource limits
- Linux bridge networking (`lxcbr0`, veth pairs)
- Unprivileged LXC containers (subuid/subgid, idmap)
- Ubuntu 22.04 (jammy) and 24.04 (noble)

## Sources Consulted
- LXC manpages on Ubuntu manpages site (lxc-create, lxc-start, lxc-stop, lxc-copy, lxc-snapshot, lxc-attach, lxc-info, lxc-ls): https://manpages.ubuntu.com/
- LXC upstream documentation: https://linuxcontainers.org/lxc/manpages/
- LXC source `src/lxc/tools/lxc_copy.c` for valid `lxc-copy` options
- LXC container configuration reference: https://linuxcontainers.org/lxc/manpages/man5/lxc.container.conf.5.html
- LXC unprivileged container guide: https://linuxcontainers.org/lxc/security/
- Kernel cgroup v2 documentation for `memory.max` / `cpu.max` semantics
- Ubuntu lxc-net default configuration (`/etc/default/lxc-net`)

## Issues Found
1. **Missing heading marker for "Resource Limits in LXC Config"** — the line was plain text instead of an `##` heading. Added the `##` prefix so it renders as a section heading consistent with the rest of the document.
2. **Incorrect config file path for unprivileged containers** — the post wrote a per-container config to `~/.config/lxc/mycontainer/config`. LXC stores unprivileged container configs at `~/.local/share/lxc/<name>/config`; `~/.config/lxc/` is only used for the per-user `default.conf`. Restructured the example to (a) place the idmap/network template in `~/.config/lxc/default.conf` *before* creation so `lxc-create` inherits it, and (b) note that the per-container config lives in `~/.local/share/lxc/mycontainer/config`.
3. **Missing `/etc/lxc/lxc-usernet` entry** — unprivileged users cannot attach veth devices to `lxcbr0` without an entry in `/etc/lxc/lxc-usernet`. Added the required `echo "$USER veth lxcbr0 10" | sudo tee -a /etc/lxc/lxc-usernet` step. Without this, networking on the unprivileged container would silently fail.
4. **Invalid `--startcontainer` flag on `lxc-copy`** — verified against the LXC source (`src/lxc/tools/lxc_copy.c`); `lxc-copy` has options like `--snapshot`, `--ephemeral`, `--foreground`, `--daemon`, `--allowrunning`, `--keepname`, `--keepmac`, etc., but no `--startcontainer` or `--start`. Replaced the single-command example with the standard two-step approach (`lxc-copy` followed by `lxc-start`).

## Review Notes
- The `ubuntu` LXC template (used in `lxc-create -t ubuntu`) still ships in the `lxc-templates` package on Ubuntu 22.04/24.04, but in practice the upstream LXC project recommends the `download` template (used in the unprivileged example) since it is faster and better maintained. The post correctly uses both — no change required.
- `lxc.cgroup2.memory.max = 2G` is accepted because the kernel's `memparse()` understands K/M/G suffixes for these cgroup v2 attributes. This is correct on modern Ubuntu (default cgroup v2).
- The cgroup v1 keys (`lxc.cgroup.memory.limit_in_bytes`, `lxc.cgroup.cpu.shares`, etc.) will only take effect on hosts running in cgroup v1 mode (or hybrid). On default Ubuntu 22.04+ (unified cgroup v2), only the `lxc.cgroup2.*` variants apply. The post acknowledges this distinction.
- The container name `focal-container` is used with `--release noble` (Ubuntu 24.04). This is only a naming inconsistency (focal = 20.04), not a technical error, so left as-is per the "only change what is technically wrong" instruction.
- The MAC prefix `00:16:3e` shown in examples is the IANA-assigned Xensource OUI commonly used by LXC/Xen — correct.
- `Ctrl+a q` to detach from `lxc-console` is correct.
