# Validation Summary: How to Run a Container with Custom Hostname in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Container hostnames
- Podman custom networks and network aliases
- Podman pods
- `/etc/hosts` and `/etc/resolv.conf`

## Sources Consulted
- Podman `podman-create` / `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-network-connect` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-network-connect.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- Several `sh -c` examples used outer double quotes, causing `$(hostname)` and `$(date)` to be expanded by the host shell before the container started. Changed those examples to use single-quoted container scripts so command substitution happens inside the container.
- The post used `--domainname`, but current official Podman run/create documentation does not document that option. Replaced those examples with fully qualified hostnames passed via `--hostname`.
- The custom network DNS section claimed the hostname itself is resolved by Podman's network DNS. Official Podman docs document DNS resolution for container names and network aliases, so the example now adds `--network-alias db-primary` and describes resolving the network alias.
- The pod section said each container can have its own hostname while sharing the pod network namespace. Official Podman docs state `podman pod create --hostname` sets the pod hostname inside all containers when using the default shared UTS namespace, so the wording was corrected.
- The inspect example printed `.Config.Domainname`, which no longer matched the corrected examples after removing `--domainname`. Removed that line and kept the hostname inspection.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed directly. Validation was performed against the current official Podman documentation.
