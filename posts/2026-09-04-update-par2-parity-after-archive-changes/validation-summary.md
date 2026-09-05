# Validation Summary: How to Update PAR2 Parity After Archived Files Change Without Losing Recoverability

## Status

validated

## Post Type

Technical guide with executable shell examples.

## Technologies Covered

- PAR 2.0, par2cmdline, and Reed-Solomon recovery slices
- SHA-256 manifests, MD5, CRC32, and digital signatures
- Bash and GNU coreutils/findutils
- Immutable archive generations, snapshots, repair drills, and filesystem publication

## Sources Consulted

- [Official par2cmdline README](https://github.com/Parchive/par2cmdline): supported operations and additional recovery blocks.
- [PAR 2.0 specification](https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html): identifiers, main packets, slice ordering, checksums, and recovery calculations.
- [Official par2cmdline manual](https://github.com/Parchive/par2cmdline/blob/master/man/par2.1): CLI flags, recursion, symlink handling, and exit statuses.
- [Official ChangeLog](https://github.com/Parchive/par2cmdline/blob/master/ChangeLog): June 10, 2026 version 1.2.0 security fixes and August 15, 2026 version 1.3.0 release.
- [par2creator.cpp](https://github.com/Parchive/par2cmdline/blob/master/src/par2creator.cpp): main-packet creation and output-file allocation.
- [diskfile.cpp](https://github.com/Parchive/par2cmdline/blob/master/src/diskfile.cpp): exclusive creation of output files.
- [GNU coreutils manual source](https://github.com/coreutils/coreutils/blob/master/doc/coreutils.texi): checksum processing, NUL-separated sorting, copying, destination semantics, and dd operands. Read through the upstream raw source because GNU's rendered manual timed out.

## Issues Found

1. **Overbroad incremental-update claim.** Scoped the opening statement to par2cmdline's supported operations rather than asserting a mathematical limitation of parity coding. The immutable-generation recommendation remains intact.
2. **Input order confused with membership.** Changed the compatibility table to require unchanged membership and explained that command-line order is irrelevant: file IDs determine the canonical order.
3. **Existing index collision when extending parity.** The additional-volume example reused archive.par2, although current output creation uses exclusive creation. Changed the output basename to archive-extra.par2 while retaining identical source paths and slice parameters.
4. **Recovery Set IDs do not guarantee generation separation.** Replaced the assertion that IDs always keep generations distinct. Same-length changes after the first 16 KiB may preserve the identifiers, so physical separation remains necessary.
5. **Failures could be ignored.** Added Bash fail-fast and pipeline handling for the sequential workflow. Changed the diff exception to tolerate differences but reject errors. The deliberately damaged verification explicitly requires status 1 before repair, while subsequent repair and checks must succeed.
6. **The repair drill could be a no-op.** Writing zeros does not alter an already-zero region. The new status check rejects that outcome; accompanying text requires another fresh-copy drill using a nonzero region. Aligned the prose with the existing at-least-3-MiB size check.
7. **Existing directories could invalidate the workflow.** Require fresh staging and restore-test destinations and an absent publication destination, avoiding stale files or unintended nesting by cp/mv.
8. **Manifest exclusion was too broad.** Replaced the basename exclusion with the exact root manifest path so payload files named GENERATION-SHA256SUMS are included.
9. **Platform and version assumptions needed clarification.** Stated Bash/GNU prerequisites and clarified that versions later than 1.2.0 also satisfy the stated security baseline.

## Review Notes

- All seven edited Bash code blocks pass bash -n. The validation JSON was parsed and checked. No par2 executable is installed in this workspace, so an end-to-end parity build and repair was not executed; PAR2 behavior was reviewed against official documentation and source.
- The documented slice sizes, redundancy percentages, recursion flag, and first-recovery-block option are valid. The 32,768 input-slice ceiling applies to the conventional format used here; sizing must account for each file's separately padded final slice.
- The article correctly requires checking hidden-file coverage, stable inputs, independent-copy verification, and retention of the previous generation. These are operational prerequisites rather than guarantees supplied by PAR2.
- Run the snippets sequentially in the same Bash session to retain fail-fast settings. Publication assumes a single maintenance writer; atomic rename concerns visibility, while crash durability also depends on the storage platform.
- Regular-file checksums and PAR2 do not preserve all filesystem metadata, symlink semantics, or empty directories. Archives needing those properties should package them into protected archive files.
- The June 2026 security statements and all three official documentation links were confirmed. MD5/CRC integrity checks remain unsuitable as an authenticity mechanism; the signed external manifest recommendation is appropriate.
