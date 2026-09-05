# Validation Summary: How to Build PAR2 Recovery Files for Long-Term Archives and Test a Restore

## Status
validated

## Post Type
Tutorial / operational archive recovery guide.

## Technologies Covered
- PAR 2.0 and par2cmdline.
- Reed-Solomon recovery blocks, MD5, CRC32, and SHA-256 manifests.
- Bash, GNU coreutils, and findutils.
- Immutable archive generations, independent backups, and disposable restore drills.

## Sources Consulted
- Official par2cmdline repository and CLI documentation: https://github.com/Parchive/par2cmdline
- Official CLI manual: https://raw.githubusercontent.com/Parchive/par2cmdline/master/man/par2.1
- PAR 2.0 specification: https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html
- Official release ChangeLog: https://github.com/Parchive/par2cmdline/blob/master/ChangeLog
- Official command-line implementation: https://raw.githubusercontent.com/Parchive/par2cmdline/master/src/commandline.cpp
- Official block-count implementation: https://raw.githubusercontent.com/Parchive/par2cmdline/master/src/par2creator.cpp
- GNU coreutils manual source (copying, checksums, sorting, dd, wc, and test): https://raw.githubusercontent.com/coreutils/coreutils/master/doc/coreutils.texi

## Issues Found
1. **Redundancy percentage used the wrong denominator.** Replaced the claim that `-r15` produces roughly 15% of original input bytes with its block-based meaning. Per-file padding and packet metadata can make the actual overhead much larger for small files.
2. **The generation manifest excluded too many files.** Changed the basename exclusion to `! -path './GENERATION-SHA256SUMS'`, so identically named payload files remain inventoried.
3. **The scratch setup could continue after failure or reuse an existing destination.** Added failure guards to directory changes and copying, and rejected an existing destination, including dangling symlinks. This prevents a failed setup from silently proceeding to the destructive drill in the wrong directory.
4. **Zero filling does not always introduce corruption.** Required nonzero bytes in the selected range and clarified the minimum file size as at least 5 MiB. Rejected a symlink as the selected test file and stopped on a failed write.
5. **The drill did not establish its recovery budget.** Added a requirement for at least two intact recovery blocks before the two-slice overwrite. A small archive with 15% redundancy may not provide that capacity.
6. **The expected verification failure needed a scripting caveat.** Explained that damaged-input verification returns nonzero and must be handled explicitly under `set -e`.
7. **Platform assumptions were unstated.** Identified Bash and GNU utilities as prerequisites for examples using `sha256sum`, zero-terminated sorting, and GNU `dd` options.

## Review Notes
- Verified create/verify/repair syntax, `-V`, recursive input selection, explicit slice size, and redundancy options. The existing warning about shell globs omitting top-level hidden entries remains relevant; readers must reconcile the protected inputs with their inventory.
- Confirmed the specification's 32,768 input-block limit, per-file slice padding, internal checksums, and bounded recovery model. The index/volume distinction, automatic volume discovery, and scanning explicitly supplied fragments agree with upstream documentation.
- The ChangeLog confirms 1.2.0 on June 10, 2026 included the cited security fixes. It also lists 1.3.0 on August 15, 2026; the article correctly treats 1.2.0 as the security-fix baseline, not as the latest release.
- Reviewed all Bash code blocks with `bash -n` and parsed the validation JSON. No local PAR2 executable is installed, so no parity creation or end-to-end repair was executed. Validation is based on documentation, implementation review, and shell syntax checks.
- The zero-fill drill depends on the documented nonzero-range prerequisite. File permissions must allow writing the disposable copy. Successful source verification alone does not establish that every stored recovery packet is intact; retain the outer manifest and perform the prescribed restore drills.
- GNU hosted manual pages were unavailable through the web tool; the official coreutils manual source was consulted instead. Referenced Parchive documentation links resolved to the intended resources.
