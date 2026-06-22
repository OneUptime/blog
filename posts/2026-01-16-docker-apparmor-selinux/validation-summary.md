# Validation Summary: How to Configure AppArmor and SELinux Profiles for Docker

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Compose
- AppArmor
- SELinux
- Kubernetes security contexts
- Linux capabilities and mandatory access control

## Sources Consulted
- Docker Docs: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Bind mounts and SELinux `:z` / `:Z` labels - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker CLI help for `docker run --security-opt`
- Moby default AppArmor profile template - https://github.com/moby/profiles/blob/main/apparmor/template.go
- Kubernetes Docs: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes Docs: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Red Hat Enterprise Linux Docs: Creating SELinux policies for containers with udica - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/creating-selinux-policies-for-containers_using-selinux
- Bane project documentation - https://github.com/genuinetools/bane
- Local `apparmor_parser` and `docker compose config` validation

## Issues Found
- Docker's default AppArmor profile was shown as readable from `/etc/apparmor.d/docker-default`. Current Docker generates `docker-default` in tmpfs and loads it into the kernel, so the check was changed to `aa-status | grep docker-default`.
- The Docker default AppArmor deny list incorrectly included raw sockets and kernel module loading as AppArmor default-profile denials. The list was updated to match the current Moby profile template: mount denial, sensitive `/proc` and `/sys` write restrictions, AF_ALG denial, and `/sys/kernel/security` restrictions.
- The MAC description implied root and privileged containers can never bypass confinement. The wording was narrowed to state that root processes remain subject to policy when policy is enforced.
- The Bane example used an unsupported `bane generate test-container` command and implied profile generation directly from a running container. It was changed to the documented TOML-driven `bane nginx.toml` flow, with `aa-logprof` for log-based refinement.
- The SELinux process-label check used `ps -eZ | grep docker`, which can miss the container process label. It was changed to `ps -eZ | grep container_t`.
- The volume-label comment used the older `svirt_sandbox_file_t` label detail. It was generalized to avoid distro/version-specific label inaccuracies.
- The custom SELinux policy example used an incomplete hand-written Type Enforcement module that would not reliably integrate with container SELinux policy. It was replaced with the Red Hat-documented `udica` workflow and generated process type.
- Docker Compose examples included the obsolete top-level `version: '3.8'` key. The key was removed from both Compose examples.
- The Kubernetes AppArmor example used the deprecated pre-v1.30 annotation. It was updated to the stable `securityContext.appArmorProfile` field with `type: Localhost`.
- The Kubernetes SELinux level value was unquoted. It was quoted to match Kubernetes documentation examples and avoid YAML parsing ambiguity.

## Review Notes
The AppArmor profile snippets were syntax-checked with `apparmor_parser -Q -N`. The updated Docker Compose snippets were checked with `docker compose config -q`. The examples remain illustrative and should still be tuned and tested against the exact application image, distribution policy package, and runtime version used in production.
