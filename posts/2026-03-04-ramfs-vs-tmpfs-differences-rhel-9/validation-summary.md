# Validation Summary: How to Use ramfs vs tmpfs and Understand the Differences on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux tmpfs
- Linux ramfs
- Linux mount, df, du, swapon, mkswap, dmsetup, and cryptsetup commands
- OpenSSL enc
- hugetlbfs

## Sources Consulted
- Linux kernel tmpfs documentation: https://docs.kernel.org/filesystems/tmpfs.html
- Linux kernel ramfs, rootfs, and initramfs documentation: https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html
- Linux tmpfs(5) manual page: https://man7.org/linux/man-pages/man5/tmpfs.5.html
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Local command help for mount, df, swapon, mkswap, shred, findmnt, and openssl enc

## Issues Found
- The feature table said ramfs was not visible in `df`. `df` can report the target filesystem, but ramfs does not provide useful capacity or usage values, so the wording was changed to "Meaningful capacity in `df`".
- The tmpfs `/proc/meminfo` example implied that `Shmem` and `SwapCached` prove a specific tmpfs mount has swapped data. They are system-wide counters, so the comment was changed to describe them as counters rather than per-mount proof.
- The dangerous ramfs `dd` example used `count=unlimited`, which is not valid `dd` syntax. It was replaced with a syntactically valid commented command that would write until stopped or until memory is exhausted.
- The ramfs key-storage section claimed the key never touches swap or persistent storage. That overstates the guarantee because applications can hold copies in swappable process memory. The wording now limits the guarantee to the decrypted file stored on ramfs and adds the process-memory caveat.
- The encrypted swap example opened a dm-crypt mapping but did not create or enable a swap area on the mapped device. The example now includes `mkswap /dev/mapper/swap` and `swapon /dev/mapper/swap`.

## Review Notes
The main tmpfs and ramfs distinctions are correct: tmpfs has configurable size and inode limits and can use swap by default, while ramfs has no backing store and can grow until it exhausts memory. Future improvements could mention tmpfs `noswap` on kernels that support it, but RHEL 9 kernel support varies by minor release and it is not necessary for this post's main guidance.
