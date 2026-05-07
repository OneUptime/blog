# Validation Summary: How to Troubleshoot Checkpoint/Restore Failures in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- CRIU
- Linux kernel checkpoint/restore support
- OCI container runtimes
- SELinux
- Linux networking and volumes

## Sources Consulted
- Podman checkpoint documentation: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` manpage: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` manpage: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU Podman integration page: https://www.criu.org/Podman
- CRIU kernel check documentation: https://criu.org/Check_the_kernel
- CRIU manpage: https://manpages.debian.org/unstable/criu/criu.8.en.html
- CRIU main page and release information: https://criu.org/Main_Page

## Issues Found
- The CRIU version-too-old example treated version 31600 as Podman's general minimum CRIU requirement. Podman's documented checkpoint workflow requires CRIU 3.11 or later, while CRIU 3.16 is required for specific features such as restoring into a pod. Updated the example to 31100 and clarified the feature-specific 3.16 requirement.
- The source-build example checked out CRIU v3.19 even though the current upstream stable release is v4.2. Updated the example tag to v4.2 while preserving the note to use a current stable release.
- The permissions section described root as an absolute CRIU requirement. Updated the wording to reflect that Podman's documented checkpoint workflow is root-container based, while CRIU itself has limited non-root support when granted required capabilities.
- The port conflict section used a rootless `rootlessport` privileged-port error, which conflicts with the article's root-container checkpoint/restore context. Replaced it with a generic bind-address conflict error.

## Review Notes
The remaining commands and option names match current Podman and CRIU documentation. The article intentionally uses generic error strings in several places; exact wording may vary by Podman, runtime, CRIU, kernel, and distribution version.
