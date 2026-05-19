# Validation Summary: How to Balance and Defragment Btrfs Volumes on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Btrfs
- btrfs-progs
- Btrfs balance
- Btrfs defragmentation
- Btrfs scrub
- systemd services and timers

## Sources Consulted
- Btrfs upstream manual page index: https://btrfs.readthedocs.io/en/latest/man-index.html
- Btrfs balance manual: https://btrfs.readthedocs.io/en/latest/btrfs-balance.html
- Btrfs filesystem manual: https://btrfs.readthedocs.io/en/stable/btrfs-filesystem.html
- Btrfs defragmentation documentation: https://btrfs.readthedocs.io/en/latest/Defragmentation.html
- Btrfs scrub manual: https://btrfs.readthedocs.io/en/latest/btrfs-scrub.html
- Btrfs glossary / btrfs(5): https://btrfs.readthedocs.io/en/stable/btrfs-man5.html

## Issues Found
- The post described `usage=50` balance filters as selecting chunks "less than 50% full." The official manual defines a single usage value as "at most" that percentage, so the wording was corrected to "at most 50% full."
- The background balance example used shell job control (`&`). That can work from an interactive shell, but the Btrfs manual documents `--background` / `--bg` for asynchronous balance. The example was updated to use `--background`.
- The post described recursive defragmentation at a mount point as defragmenting the "entire filesystem." The Btrfs filesystem manual states that recursive defragmentation does not descend into subvolumes or mount points, so the heading and caveat were corrected.
- The snapshot caveat labelled `btrfs subvolume list` as checking snapshot usage. That command lists subvolumes; it does not report space usage. The comment was corrected to say it lists subvolumes and snapshots before defragmenting.

## Review Notes
The remaining commands and explanations match the upstream Btrfs documentation. Balance operations can still fail with ENOSPC if there is not enough unallocated work space, and the "10-15% free" guidance should be treated as a practical heuristic rather than a hard guarantee.
