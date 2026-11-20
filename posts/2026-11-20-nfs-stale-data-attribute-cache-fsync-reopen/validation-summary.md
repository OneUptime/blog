# Validation summary

Reviewed Linux NFS cache distinctions, protocol-specific option behavior, fsync and rename semantics, Python buffering, and RFC 7530 caching/locking rules. The article distinguishes retained file descriptors from actual cross-client cache behavior.

## Checks performed

Executed the published Python 3.11 descriptor example on local macOS storage. Both assertions passed: the retained descriptor returned generation one and a new open returned generation two. The published snippet exactly matches the executed file. Linux inspection commands were checked against official manuals and passed Bash syntax checks. Mermaid was structurally checked (seven nodes, six edges), not rendered. The social image was generated and visually reviewed; title fits.

## Limits

No Linux NFS client/server or two-host test was available. No claims are made about measured NFS visibility, locking, delegations or recovery. The descriptor fixture does not test power-loss durability, directory synchronization or a production publication implementation. The staged two-client protocol remains a required environment-specific test.

## Checked sources

- https://man7.org/linux/man-pages/man8/findmnt.8.html
- https://man7.org/linux/man-pages/man8/nfsstat.8.html
- https://man7.org/linux/man-pages/man5/nfs.5.html
- https://www.rfc-editor.org/rfc/rfc7530.html#section-10.3
- https://docs.python.org/3.11/library/os.html#os.fsync
- https://man7.org/linux/man-pages/man2/fsync.2.html
- https://man7.org/linux/man-pages/man2/rename.2.html
- https://man7.org/linux/man-pages/man5/nfs.5.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
