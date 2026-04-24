# Validation Summary: How to Configure AppArmor Profiles for Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- AppArmor
- seccomp
- Linux container security

## Sources Consulted
- Docker Docs: AppArmor security profiles for Docker — https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Define services in Docker Compose (`security_opt`) — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker container run` reference (`--security-opt`) — https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Seccomp security profiles for Docker — https://docs.docker.com/engine/security/seccomp/
- Ubuntu Server documentation: AppArmor — https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu manpage: `apparmor.d(5)` — https://manpages.ubuntu.com/manpages/noble/man5/apparmor.d.5.html
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer official release notes: 2.40.0 STS — https://github.com/portainer/portainer/releases

## Issues Found
- The AppArmor status check used `grep docker` with an exact expected output line. That was too loose for the command and too specific for the output. I changed it to `grep docker-default` and updated the expectation to “Output should include `docker-default`”.
- The Compose example used a top-level `version: "3.8"` field. Docker now marks the top-level `version` field as obsolete, so I removed it.
- The standalone Portainer UI section implied the `security-opt` workflow was generally available. Portainer added `-security-opt` support for Docker container creation in 2.40.0, so I added that version requirement and simplified the UI instructions to avoid unsupported field-label claims.
- The complain-mode explanation implied violations are only logged and not blocked. I corrected this to note that explicit `deny` rules still apply, and plain `deny` rules are not logged unless audited.
- The log-monitoring guidance used `/var/log/syslog` and `ausearch -m AVC`, and the profile-tuning step used `aa-genprof docker-my-api`. I replaced those with kernel-log inspection via `dmesg` or `journalctl -k`, and replaced `aa-genprof` with `aa-logprof` because `aa-genprof` is for generating profiles for executables, while `aa-logprof` updates existing profiles from logged events.

## Review Notes
Stack-based deployment through Portainer remains the most portable way to apply `security_opt` because it follows Docker Compose semantics. Standalone-container UI support for `security-opt` is version-specific in Portainer.
