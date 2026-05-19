# Validation Summary: How to Run Both AppArmor and SELinux on Ubuntu (and Why You Shouldn't)

## Status
validated

## Post Type
Explanatory guide / opinion-backed technical reference

## Technologies Covered
- Linux Security Modules (LSM) framework
- AppArmor (and its userspace tools: `aa-enforce`, `aa-genprof`, `apparmor_status`)
- SELinux (and the Ubuntu `selinux-basics` / `selinux-policy-default` packages, `selinux-activate`, `sestatus`)
- Landlock LSM
- Yama LSM
- Lockdown LSM
- POSIX capabilities
- Kernel boot parameters (`security=`, `lsm=`, `apparmor=`, `selinux=`)
- sysctl kernel hardening (`kernel.kptr_restrict`, `kernel.yama.ptrace_scope`, `kernel.sysrq`)
- auditd, ufw, seccomp (referenced as complementary controls)
- Ubuntu (general system administration)

## Sources Consulted
- [Linux Kernel LSM documentation](https://docs.kernel.org/admin-guide/LSM/index.html)
- [AppArmor — The Linux Kernel documentation](https://docs.kernel.org/admin-guide/LSM/apparmor.html)
- [LSM stacking and the future — LWN.net](https://lwn.net/Articles/804906/)
- [LSM: Module stacking for AppArmor — LWN.net](https://lwn.net/Articles/837994/)
- [Linux 5.1 changelog — kernelnewbies.org](https://kernelnewbies.org/Linux_5.1)
- [Ubuntu Wiki: SELinux](https://wiki.ubuntu.com/SELinux)
- [Kernel parameters — ArchWiki](https://wiki.archlinux.org/title/Kernel_parameters)

## Issues Found
No technical issues found.

The post's central claim — that AppArmor and SELinux are both "exclusive" LSMs and cannot serve as parallel MAC enforcement systems on the same running kernel — is confirmed by the upstream kernel documentation and LSM history. All command examples, package names, boot parameters, sysctl values, and LSM descriptions are accurate for current Ubuntu releases.

## Review Notes
- The statement "Since Linux kernel 4.15, a limited form of LSM stacking is supported" is slightly imprecise. Minor-LSM stacking (capability, Yama, etc.) predates 4.15, and the major infrastructure for broader stacking (infrastructure-managed blobs, `lsm=` boot parameter) landed in Linux 5.1. The version reference is approximate but the general claim is correct and not misleading enough to require a fix.
- Work to remove AppArmor's "exclusive" flag and enable real AppArmor + SELinux stacking has been ongoing in upstream patches for several years (Casey Schaufler's series). If/when this lands in a mainline release and Ubuntu adopts a kernel that exposes it, the central premise of the post would deserve revisiting. As of writing, the post's "you cannot meaningfully run both" conclusion remains accurate for Ubuntu's shipped kernels.
- `sudo aa-enforce /etc/apparmor.d/*` will attempt to enforce every profile in that directory, including subdirectory placeholders and abstractions. In practice this works because non-profile files are skipped, but it can produce noisy warnings on real systems. Acceptable as illustrative code.
- The `cat /boot/config-$(uname -r) | grep CONFIG_SECURITY` example uses a "useless use of cat" pattern; functionally correct but `grep CONFIG_SECURITY /boot/config-$(uname -r)` would be more idiomatic. Not a technical error.
