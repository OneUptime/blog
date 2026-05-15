# Validation Summary: How to Create SELinux Policies for Podman Containers Using udica on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- Podman
- udica
- semodule
- audit2allow
- podman-compose

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Creating SELinux policies for containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/creating-selinux-policies-for-containers_using-selinux
- Podman run documentation, `--security-opt` and SELinux volume relabeling options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- udica upstream README: https://github.com/containers/udica
- udica(8) man page: https://manpages.opensuse.org/Tumbleweed/udica/udica.8.en.html
- audit2allow documentation: https://fedoraproject.org/wiki/SELinux/audit2allow

## Issues Found
- The post said udica generates a policy that allows "exactly what the container needs and nothing more." This was too strong because udica policies operate on SELinux labels, and a label can cover multiple resources. Changed the wording to say udica generates a tailored policy based on the inspected requirements.
- The post described udica templates as granting "capability sets." udica templates are CIL blocks for access patterns such as home directory, log, network, X server, and terminal access. Updated the wording to "specific access patterns."
- The "Handling Additional Denials" section used `audit2allow -M` to create and install a separate module for denials from a udica-generated source context. udica documents this as unsupported and recommends `--append-rules`. Replaced the commands with `audit2allow` rule output, `udica --append-rules`, and reinstallation of the regenerated CIL module.

## Review Notes
- The main udica workflow, including `udica -j`, loading the generated `.cil` file with the required templates, and restarting Podman with `--security-opt label=type:<policy>.process`, matches Red Hat's RHEL 9 documentation.
- The `:Z` volume relabeling explanation matches Podman's documented SELinux volume options. Podman also documents caveats for relabeling system directories and shared pod labels, but those caveats are outside the scope of this post.
