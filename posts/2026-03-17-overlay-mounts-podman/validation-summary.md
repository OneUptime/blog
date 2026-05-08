# Validation Summary: How to Use Overlay Mounts with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux OverlayFS
- Container volume mounts
- SELinux volume labeling

## Sources Consulted
- Podman `podman-run` documentation, version 5.6.1: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--mount` option documentation: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman `--volume` option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Linux kernel OverlayFS documentation: https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html

## Issues Found
- The post used `--mount type=overlay`, but Podman documentation lists supported `--mount` types and does not include `overlay`. I changed the examples to use Podman's documented overlay volume option, `-v /host/path:/container/path:O`.
- The post described an `upperdir` by itself in one example. Podman's documented custom overlay option uses `:O,upperdir=/some/upper,workdir=/some/work`, so I added the matching `workdir`.
- The "multiple layers" example implied Podman's volume overlay option layers multiple lower directories. Podman's documented `:O` volume behavior uses the source directory as the lower layer and either container storage or a custom upper directory as the upper layer. I changed the section to describe a persistent upper layer.
- The read-only overlay example used `--mount type=overlay` with `readonly`. Podman's documented overlay volume option conflicts with other volume options such as `ro`, so I changed that section to a read-only bind-style volume example for strict protection.
- The SELinux example combined `:O,z`, but Podman documentation states that the `O` option conflicts with other volume options. I removed `z` and noted that Podman labels overlay volume content with a private label.

## Review Notes
Podman was not installed in the local environment, so commands were reviewed against official Podman documentation rather than executed locally. The corrected examples use current documented Podman syntax.
