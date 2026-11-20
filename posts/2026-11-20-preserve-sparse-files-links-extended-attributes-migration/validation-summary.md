# Validation summary

Python 3.11.13 created and inspected a disposable local macOS fixture. Hard-link identity, relative symlink target, logical size and sparse-file boundary bytes passed. The 64 MiB logical file reported 16 KiB allocated. Negative tests rejected a split hard link and a changed symlink target despite equivalent readable content. Published Python matches the executed files.

Python extended-attribute APIs were unavailable locally and the xattr branch was explicitly skipped. No Linux ACL/xattr, network filesystem or rsync 3.4.1 migration was executed. The installed system implementation is openrsync, so it was not used to imply validation of modern rsync flags.

Two shell blocks passed Bash syntax checks. Tagged rsync 3.4.1 documentation and official Linux/Python filesystem references support the examples. The inspector is deliberately limited and the article requests full content and application-specific metadata checks for real migration acceptance.

## Checked sources

- https://man7.org/linux/man-pages/man2/link.2.html
- https://man7.org/linux/man-pages/man2/symlink.2.html
- https://man7.org/linux/man-pages/man7/xattr.7.html
- https://man7.org/linux/man-pages/man2/lseek.2.html
- https://raw.githubusercontent.com/RsyncProject/rsync/v3.4.1/rsync.1.md
- https://docs.python.org/3.11/library/os.html

The generated social image was visually inspected; its title is readable without clipping.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
