# Validation Summary: How to View Container Processes with podman top

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux process inspection
- Shell scripting
- `ps` process format descriptors

## Sources Consulted
- Podman official documentation: `podman-top(1)` - https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Podman official documentation: `podman-container(1)` command list - https://docs.podman.io/en/latest/markdown/podman-container.1.html
- Linux `ps(1)` manual page from man7.org / procps-ng - https://www.man7.org/linux/man-pages/man1/ps.1.html

## Issues Found
- The introduction described `podman top` as working like Linux `top` and said the post covered all capabilities. The official Podman documentation describes `podman top` as displaying running processes and says the default output is similar to `ps -ef`; it is not an interactive live `top` replacement. Updated the wording to say it displays process information similar to `ps` and covers common capabilities.
- The "Sort by CPU and memory usage" example did not actually sort; it only selected CPU and memory columns. Updated the comment to "Show CPU and memory usage" so the command description matches the behavior.
- The post stated that `podman top` works without `ps` installed in the container and is more reliable than `podman exec ps` without caveats. The Podman manual notes that supported descriptors are handled by Podman, while ps options, flags, or fallback paths may execute `ps`. Updated the wording to specify "with supported descriptors" and "can be more reliable."

## Review Notes
The descriptor examples used in the post are consistent with Podman's documented descriptors and procps-ng `ps` format specifiers. The local environment did not have the `podman` binary installed, so validation used the current official Podman documentation rather than local command execution.
