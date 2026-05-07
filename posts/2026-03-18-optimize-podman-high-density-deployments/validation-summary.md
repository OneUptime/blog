# Validation Summary: How to Optimize Podman for High-Density Container Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups and resource limits
- Linux sysctl kernel parameters
- containers.conf
- containers-storage.conf
- OverlayFS
- macvlan networking
- Dockerfile/Containerfile image builds
- Bash scripting

## Sources Consulted
- Podman run official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman stats official documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman pod create official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman network create official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- containers.conf manual page: https://man.archlinux.org/man/containers.conf.5.en
- containers-storage.conf manual page: https://manpages.ubuntu.com/manpages/noble/en/man5/containers-storage.conf.5.html
- Linux sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/
- usermod manual page: https://man7.org/linux/man-pages/man8/usermod.8.html

## Issues Found
- The baseline script assumed the rootful storage path `/var/lib/containers/storage`. I changed it to read `.Store.GraphRoot` from `podman info`, falling back to the rootful path only if needed, so it also works with rootless Podman storage.
- The baseline memory average parsed `podman stats --format json` memory strings as plain MB. Podman reports units such as kB, MB, and GB, so I updated the `jq` logic to convert common units before averaging.
- The memory examples used `--memory-swap=64m` with `--memory=64m` and described that as disabling swap. Podman documents `--memory-swap` as the total memory plus swap limit and expects it to be larger than `--memory`, so I changed the examples to `--memory-swap=128m` and corrected the explanation.
- The post recommended `--oom-kill-disable` without caveat. Podman documents this flag as unsupported on cgroups v2 systems, so I replaced the example with `--oom-score-adj=-500`, which is the current option for tuning OOM preference.
- The scratch-image Dockerfile snippet copied from an undefined `builder` stage. I changed the minimal snippet to copy a prebuilt static binary directly.
- The persistent sysctl snippet omitted several settings from the preceding one-time tuning commands. I added `fs.inotify.max_queued_events`, `net.ipv4.tcp_max_syn_backlog`, and `vm.overcommit_ratio` so the persistent example matches the tuning example.
- The macvlan example did not mention that Podman macvlan networks require rootful operation. I added the rootful caveat and used `sudo` for the macvlan network and container commands.
- The `containers.conf` comment described `num_locks` as controlling parallel operations. The containers configuration treats it as the number of locks available for Podman resources, so I corrected the comment.

## Review Notes
Podman is not installed in the local review environment, so CLI behavior was checked against current official Podman documentation and container configuration manual pages rather than local `podman --help` output. Some recommendations, especially kernel limits and memory sizing, remain workload-dependent and should be benchmarked on the target kernel, cgroup mode, filesystem, and Podman version before production rollout.
