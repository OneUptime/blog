# Validation Summary: How to Use Security Labels with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- SELinux
- Multi-Category Security (MCS)
- Linux containers
- Linux Audit (`ausearch`)
- `sealert` / setroubleshoot

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 SELinux troubleshooting documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- BusyBox manual (`ls` applet options): https://busybox.net/BusyBox.html
- Alpine Linux BusyBox documentation: https://wiki.alpinelinux.org/wiki/BusyBox
- `ausearch(8)` manual: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The `ls -lZ` example inside `docker.io/library/alpine:latest` was unreliable. Alpine uses BusyBox by default, and BusyBox `ls` does not support `-Z`. I changed that container example to `registry.access.redhat.com/ubi9/ubi`, which is appropriate for demonstrating SELinux file contexts.
- The sentence in the label-sharing section was too broad. Podman documents two sharing patterns: shared relabeling with `:z`, and same-level sharing when you explicitly set the SELinux level. I narrowed the text so it now correctly describes sharing privately relabeled content by assigning the same MCS label.
- The `label=disable` explanation described the option as disabling SELinux label enforcement. Podman documents it as disabling SELinux label separation for the container. I corrected that wording and removed the stronger claim that the inspect output must show no process label.
- The first `ProcessLabel` example used an exact SELinux context as the expected output. The important stable part is that the label includes `container_t` plus MCS categories, while other context fields can vary by system. I softened that expectation accordingly.

## Review Notes
- Verified as a code-focused technical guide after the corrections above.
- `podman inspect ... --format '{{.ProcessLabel}}'` is current and documented through the `.ProcessLabel` placeholder in `podman container inspect`.
- The local review environment did not have Podman installed, so command validation was documentation-based rather than runtime-executed.
