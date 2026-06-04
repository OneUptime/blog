# Validation Summary: How to Use Docker Volumes with SELinux Labels

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine
- Docker bind mounts and named volumes
- Docker Compose
- SELinux labels and MCS categories
- Linux SELinux administration tools (`chcon`, `semanage`, `restorecon`, `ausearch`, `audit2allow`, `semodule`)

## Sources Consulted
- Docker Docs: Bind mounts, including `:z` and `:Z` SELinux relabeling options: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose service `volumes` syntax and SELinux access modes: https://docs.docker.com/reference/compose-file/services/#volumes
- Docker Docs: Compose `version` top-level element is obsolete: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker run --security-opt` SELinux label options: https://docs.docker.com/reference/cli/docker/container/run/#security-opt
- Docker Docs: Rootless mode behavior and user namespace prerequisites: https://docs.docker.com/engine/security/rootless/
- Red Hat Enterprise Linux SELinux documentation: MCS behavior and container policy context: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/assembly_using-multi-category-security-mcs-for-data-confidentiality_using-selinux
- Red Hat Enterprise Linux SELinux documentation: persistent file context changes with `semanage fcontext` and `restorecon`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- GNU coreutils `chcon(1)` manual available locally
- Local Docker CLI help and `docker compose config` validation

## Issues Found
- The post described `:z` and `:Z` as general volume flags. Docker documents them as SELinux relabeling options for bind-mount host content, so the wording was changed to say "bind mounts".
- The post said any container mounting a `:z` directory can read and write it. SELinux relabeling only addresses SELinux access; Unix permissions and read-only mount mode still apply. The sentence was corrected.
- The "How Relabeling Works" section said Docker runs `chcon` internally. Docker documents the relabeling behavior but not an internal `chcon` invocation, so the wording was changed to describe the examples as equivalent effects.
- The post recommended mounting `/etc/hostname` with `:z,ro` as a safe approach. Docker warns that SELinux relabel options change labels on the host path itself, so the example was corrected to use a read-only bind mount without relabeling.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. It was removed.
- The Compose example used `:z` on a named volume and explained that it was needed for sharing between services. Docker documents `z`/`Z` as bind-mount host-content relabeling options, and named volumes do not require `:z` to be shared by multiple services. The named-volume entries and explanation were corrected.

## Review Notes
The remaining examples are syntactically valid and align with current Docker and SELinux documentation. For production systems, custom policies generated with `audit2allow` should still be reviewed carefully because generated allow rules can be broader than intended.
