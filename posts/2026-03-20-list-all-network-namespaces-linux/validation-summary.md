# Validation Summary: How to List All Network Namespaces on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux network namespaces
- `iproute2` (`ip netns`)
- `util-linux` (`lsns`)
- Docker CLI (`docker inspect`)
- GNU coreutils (`stat`)
- `/proc` namespace handles

## Sources Consulted
- `ip-netns(8)` upstream man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `lsns(8)` upstream man page: https://man7.org/linux/man-pages/man8/lsns.8.html
- `namespaces(7)` upstream man page: https://man7.org/linux/man-pages/man7/namespaces.7.html
- `network_namespaces(7)` upstream man page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- GNU coreutils `stat` documentation: https://www.gnu.org/software/coreutils/stat
- Local command help/man output: `ip netns help`, `man ip-netns`, `lsns --help`, `stat --help`

## Issues Found
- The post said the `(id: N)` suffix shown by `ip netns list` was the kernel namespace identifier. I corrected this to explain that it is the network namespace ID (`nsid`) relative to the current network namespace, not the namespace inode.
- The `ip netns list -v` example was not documented in current `iproute2` and did not match the claimed behavior of showing IDs and interface counts. I replaced it with `ip netns list-id`, which is the documented command for showing namespace IDs.
- The post described `lsns -t net` as listing "all" network namespaces. I corrected that wording to say it shows active network namespaces visible via `/proc`, which is the accurate scope documented by `lsns`.
- The post used `readlink /var/run/netns/ns1`, but named namespaces under `/var/run/netns` are bind-mounted namespace files rather than `/proc`-style symlinks. I replaced those comparisons with `stat -Lc '%i' ...` so the article compares namespace inode numbers correctly.
- The process-association example depended on `readlink` for a named namespace file. I replaced it with the documented `ip netns pids ns1` command for listing processes in a named namespace.
- The Docker section described a "bind-mount" step but used `ln -sf`, which creates a symlink, and it bypassed the documented `iproute2` workflow. I replaced that example with `ip netns attach my_container "$CONTAINER_PID"`, which is the current documented way to give an existing process network namespace a name.
- The conclusion repeated two inaccurate claims: that `lsns -t net` reveals all namespaces and that Docker requires a manual bind-mount step. I corrected both statements to match the updated commands and documented behavior.

## Review Notes
- Current `iproute2` documentation uses `/run/netns`, while the post uses `/var/run/netns`. On modern Linux systems `/var/run` is typically a symlink to `/run`, so the post's path remains valid.
- `lsns` may return incomplete information for non-root users because it reads namespace information from `/proc`.
- Docker was not installed in this review environment, so the Docker-specific command was validated against the official Docker CLI documentation rather than local command output.
