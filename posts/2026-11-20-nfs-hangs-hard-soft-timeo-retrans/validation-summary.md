# Validation summary

Reviewed the Linux NFS manual for retry policies, error behavior, units, TCP defaults, softreval and intr. Checked findmnt and ps flags against their manuals and reviewed GNU command and umount semantics.

Both published shell blocks passed Bash syntax checking. The Mermaid diagram contains six nodes and five structurally valid edges; it was not rendered. The generated image was visually inspected and its title is readable and unclipped.

No Linux command runtime, NFS deployment, outage injection, mount change, data-integrity or recovery test was performed. The article explicitly presents the commands as source-verified and the rehearsal as a proposed staging protocol.

## Checked sources

- https://man7.org/linux/man-pages/man1/df.1.html
- https://man7.org/linux/man-pages/man1/ls.1.html
- https://man7.org/linux/man-pages/man5/nfs.5.html
- https://man7.org/linux/man-pages/man8/findmnt.8.html
- https://man7.org/linux/man-pages/man1/ps.1.html
- https://man7.org/linux/man-pages/man1/timeout.1.html
- https://man7.org/linux/man-pages/man8/umount.8.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
