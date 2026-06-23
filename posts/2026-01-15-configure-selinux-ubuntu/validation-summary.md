# Validation Summary: How to Configure SELinux on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SELinux (Security-Enhanced Linux) on Ubuntu/Debian
- Mandatory Access Control (MAC), Type Enforcement, RBAC, MLS/MCS
- `selinux-basics` / `selinux-policy-default` Debian tooling (`selinux-activate`, `/etc/selinux/default/`)
- `semanage`, `restorecon`, `chcon`, `matchpathcon`, `fixfiles`
- SELinux booleans (`getsebool`, `setsebool`)
- Custom policy modules (refpolicy `.te` / `.fc`, `policy_module`, `gen_context`, `semodule`)
- `auditd`, `ausearch`, `audit2why`, `audit2allow`
- SELinux with Docker, Podman, and Kubernetes

## Sources Consulted
- Debian SELinux setup documentation / wiki (https://wiki.debian.org/SELinux/Setup) — `selinux-activate`, `selinux-basics`, `selinux-policy-default`, `default` policy type, `/.autorelabel`
- SELinux Project user resources and `semanage`/`restorecon`/`setsebool` man pages (https://github.com/SELinuxProject)
- Red Hat SELinux User's and Administrator's Guide — security context format, modes, booleans, `audit2why`/`audit2allow`, `http_port_t` default ports
- SELinux reference policy interface conventions (`domain_type`, `domain_entry_file`, `init_daemon_domain`, `files_pid_file`, `files_type`, `gen_context`)
- Docker `--security-opt label=` documentation and container SELinux types (`container_t`, `container_file_t`)
- Podman `generate systemd` and `top` documentation (https://docs.podman.io)
- Kubernetes `seLinuxOptions` securityContext reference (https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)

## Issues Found
1. **Wrong SELinux type for container/pod processes (`container_runtime_t`).** The Docker example (`docker run --security-opt label=type:container_runtime_t`) and both Kubernetes `seLinuxOptions.type` fields used `container_runtime_t`. That type is the domain for the container *engine/runtime* itself, not for confined container processes — which run as `container_t` (the post's own "Container SELinux Types" section states this). Using the runtime type would grant elevated privileges and defeat container isolation. Changed all three occurrences to `container_t`.
2. **Undeclared type causes module build/install failure.** The `myapp.fc` file contexts referenced `myapp_var_run_t` for the PID file, but that type was never declared in `myapp.te`. A file-context entry referencing an undefined type makes the module fail to build/install (invalid context). Added the missing `type myapp_var_run_t;` declaration plus `files_pid_file(myapp_var_run_t)` in the type-declarations section so the `.fc` reference resolves.
3. **Mislabeled command comment.** The Podman snippet commented `# Generate SELinux policy for container` above `podman generate systemd --new ...`, which generates a systemd unit file, not an SELinux policy. Corrected the comment to describe generating a systemd unit (which preserves SELinux labels on restart).

## Review Notes
- The post correctly targets Debian/Ubuntu conventions: `selinux-activate`, `SELINUXTYPE=default`, and `/etc/selinux/default/contexts/files/` paths (RHEL would use `targeted` and `/etc/selinux/targeted/`). This is consistent throughout.
- In `myapp.te`, both `domain_type`/`domain_entry_file` and `init_daemon_domain` are called for `myapp_t`. `init_daemon_domain` internally performs equivalent declarations; the redundancy is tolerated by the reference policy build (the macros emit repeatable `typeattribute`/`allow` statements) and compiles successfully, so it was left as-is. A future cleanup could drop the explicit `domain_type`/`domain_entry_file` calls.
- `matchpathcon` is still functional but is deprecated upstream in favor of `selabel_lookup`-based tooling; not changed since it remains valid on current Ubuntu releases.
- `podman generate systemd` is deprecated in newer Podman in favor of Quadlet, but still works; left as-is since it remains available.
- SELinux is not officially supported/maintained as a first-class MAC on Ubuntu (AppArmor is the default), so some packages and policy coverage can lag behind RHEL-family distributions. The guide's "remove AppArmor / install SELinux" path is accurate but inherently more fragile on Ubuntu — worth noting for readers but not a technical error.
