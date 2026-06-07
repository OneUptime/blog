# Validation Summary: How to Configure Podman Security

## Status
validated

## Post Type
Technical tutorial / how-to guide

## Technologies Covered
- Podman container runtime
- Rootless containers and user namespaces (subuid/subgid, newuidmap/newgidmap)
- SELinux mandatory access control (container labels, MCS, custom policy modules)
- Seccomp syscall filtering profiles
- Linux capabilities (cap-drop/cap-add, containers.conf defaults)
- Networking modes (none, host, bridge, slirp4netns, pasta) and CNI/netavark networks
- Read-only root filesystem and tmpfs mounts
- cgroups v2 resource limits (memory, CPU, pids, block I/O)
- Image signing/verification (policy.json, registries.d, GPG, skopeo)
- systemd integration (podman generate systemd, hardening directives)

## Sources Consulted
- Podman official documentation: https://docs.podman.io/
- `podman run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `podman info` reference: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- `podman pull` reference: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- containers.conf reference (containers/common): https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- containers-policy.json reference: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- containers-registries.d reference: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md
- containers/common default seccomp profile: https://github.com/containers/common/blob/main/pkg/seccomp/seccomp.json
- shadow-utils `usermod` man page (`--add-subuids`, `--add-subgids`)
- SELinux container policy / container-selinux project
- Bash reference manual (line continuation and comment handling)

## Issues Found

1. **Broken Markdown heading for "Resource Limits and Cgroups"** — the section title was emitted as a plain paragraph because the leading `##` was missing. Added the heading marker so it renders as a real section.

2. **Wrong `podman info` template field for the default seccomp profile** — the post used `{{json .Host.Security.DefaultSeccompProfile}}`, but Podman exposes this as `Host.Security.SeccompProfilePath` (a string path to the profile file). The original would always print `null`. Replaced with a command that prints the path and a follow-up `cat ... | jq .` to actually view the profile contents.

3. **Invalid `podman pull` flag `--signature-verify=true`** — this flag does not exist in Podman. Signature verification is enforced by the configured `policy.json`, optionally overridden per-invocation with `--signature-policy=PATH`. Replaced the invalid flag with `--signature-policy=/etc/containers/policy.json` and clarified the comment.

4. **Invalid `containers.conf` keys (`userns_size`, `uidmap`, `gidmap`)** — the `[containers]` section in containers.conf has no such top-level keys. The supported way to configure auto user-namespace size and mapping is through suffixed options on `userns`, e.g. `userns = "auto:size=65536,uidmapping=...,gidmapping=..."`. Replaced the snippet with a valid single-line `userns` setting.

5. **Broken Bash line continuation in the "Complete Security Hardening Example" script** — the script contained `# ...` comment lines in between `\`-continued lines (e.g. `\` followed by a `# Drop all capabilities ...` line, followed by `--cap-drop=all \`). Because `\` joins the next line and a `#` at the start of a word terminates the rest of the line as a comment, the original script would silently truncate the `podman run` invocation at the first inline comment, then try to execute the remaining flags as standalone commands. Removed the inline comments and placed a single explanatory comment block above the command instead, so the script is now syntactically correct.

## Review Notes
- `podman generate systemd` is officially deprecated as of Podman 4.4 in favor of Quadlet (`.container` unit files under `~/.config/containers/systemd/`). The command still works and is documented, so the post is not factually wrong, but a future revision could mention Quadlet as the recommended approach.
- The "blocks approximately 50 system calls" framing for the default seccomp profile is an approximation. The default profile is an allow-list (~300+ syscalls allowed depending on architecture/kernel) with the default action `SCMP_ACT_ERRNO`; the number of "dangerous" syscalls explicitly excluded is roughly in that range, so the statement is acceptable as a high-level summary.
- The default-capabilities list shown in the diagram (CHOWN, SETUID, SETGID, NET_BIND_SERVICE, KILL kept; SYS_ADMIN, NET_ADMIN, SYS_PTRACE, SYS_MODULE, MKNOD dropped) matches Podman 4.x defaults — MKNOD was removed from the default set in modern Podman.
- The policy.json example uses `"docker.io/library"` and `myregistry.io` scopes correctly; the empty-string scope (`""`) is the documented fallback for "everything not matched above" within a transport.
- `--userns=auto` in the hardening example is mutually-exclusive in practice with explicit `--uidmap` / `--gidmap` flags (Podman normally errors if both are passed). The example is still useful as a documentation of all knobs in one place, but readers should pick one approach per container.
