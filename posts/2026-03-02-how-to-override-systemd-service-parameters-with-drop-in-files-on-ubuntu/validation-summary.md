# Validation Summary: How to Override systemd Service Parameters with Drop-In Files on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (unit files, drop-ins, service management)
- systemctl (edit, cat, revert, daemon-reload, show)
- systemd-delta
- Ubuntu service management
- Bash / shell (tee, mkdir, rm)

## Sources Consulted
- systemd.unit(5) man page — https://www.man7.org/linux/man-pages/man5/systemd.unit.5.html
- systemd.service(5) man page — https://www.man7.org/linux/man-pages/man5/systemd.service.5.html
- systemd.exec(5) man page — https://www.man7.org/linux/man-pages/man5/systemd.exec.5.html
- systemctl(1) man page — https://www.man7.org/linux/man-pages/man1/systemctl.1.html
- systemd-delta(1) man page — https://www.man7.org/linux/man-pages/man1/systemd-delta.1.html
- systemd-getty-generator — https://www.freedesktop.org/software/systemd/man/latest/systemd-getty-generator.html

## Issues Found

1. **`StartLimitIntervalSec` / `StartLimitBurst` placed in `[Service]` section.**
   - The post had these rate-limiting directives in the `[Service]` section. Per systemd.unit(5), these belong in the `[Unit]` section. While systemd accepts the legacy placement for backward compatibility, the modern, correct location is `[Unit]`.
   - Fix: Moved them into a `[Unit]` block with a brief explanatory comment.

2. **Misleading comment on `Restart=always`.**
   - The original comment read `# Restart the service on any non-zero exit`, which describes `Restart=on-failure`. Per systemd.service(5), `Restart=always` restarts the service regardless of exit code (clean or unclean), signal termination, or timeout.
   - Fix: Updated the comment to `# Restart the service whenever it exits, regardless of exit code`.

3. **Incorrect description of `systemctl revert`.**
   - The original code comment said `# This removes the drop-in if you save an empty file` next to `sudo systemctl revert nginx.service`. That conflated `systemctl edit` (empty save) with `systemctl revert`. Per systemctl(1), `revert` is an independent command that removes drop-ins and full overrides for the named unit.
   - Fix: Replaced the comment with `# Remove all drop-ins and full overrides for this unit` and adjusted the surrounding sentence from "Using `systemctl edit`:" to "Or use `systemctl revert`:" so the section header matches what's demonstrated.

## Review Notes
- The remainder of the post is technically accurate: drop-in directory layout, lexicographic ordering, `systemctl edit` creating `override.conf`, the empty-assignment pattern to clear list-type directives like `ExecStart=`, template unit drop-ins (`getty@.service.d/` vs `getty@tty1.service.d/`), `TTYVTDisallocate=no`, and `systemd-delta --type=extended`.
- On modern Ubuntu, `/lib` is a symlink to `/usr/lib`, so references to `/lib/systemd/system/` resolve correctly to `/usr/lib/systemd/system/`. Either path is fine to mention.
- The statement "highest number wins on conflicts" is a simplification: it is only true for single-value directives. For list-type directives (e.g., `ExecStartPre`, `Environment`), values from all drop-ins accumulate unless the list is explicitly cleared with an empty assignment. The post does cover the empty-assignment pattern elsewhere, so this is not misleading enough to require a fix.
- `ProtectHome=true` is valid (per systemd.exec(5), the directive accepts a boolean or `read-only`/`tmpfs`).
