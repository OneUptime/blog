# Validation summary

Reviewed chunk-level versus file-level scheduling against the pinned implementation. The article distinguishes actual worker boundaries, aggregate report correctness and workload-specific performance.

## Sources reviewed

- https://raw.githubusercontent.com/darold/pgbadger/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://github.com/darold/pgbadger/releases/tag/v13.3
- https://www.man7.org/linux/man-pages/man1/time.1.html

## Checks performed

Executed pgBadger13.3 with Perl5.34.1 against a19265254-byte synthetic log containing24000 timed statements, multiline SQL and four backend PIDs. Serial, lowercase-j4, uppercase-J4 over four plain files and uppercase-J4 over four gzip files each produced24000 executions,24seconds total duration and one normalized query group.

Verbose output showed four chunks for the large file. An80010-byte100-record fixture remained one chunk under-j4. Uppercase-J4 on that one input did not split it. All six case counts were asserted. Executed the exact article timing loop with only executable/input/scratch paths adapted to the local100-record fixture; workers1/2/4 each returned100 and the installed time utility emitted real/user/sys fields. Shell syntax checks passed.

The six-node/five-edge diagram passed structural checks. The generated1280x720 social image was visually reviewed; all three title lines fit.

## Limits

Tests used synthetic local standard-error input on macOS and Apple's gzip. No database or production benchmark was involved. The fixture does not prove equivalence for every chunk boundary, prepared statement or error continuation. CSV, SSH, standard input and other compressed formats were source-reviewed where discussed, not exercised. Text reports were inspected without HTML browser review. The timing loop is a functional test only; no universal speedup or memory sizing claim is made. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
