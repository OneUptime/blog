# Validation review

Actual JuiceFS1.4.2 commands ran on a disposable SQLite/file-backed volume. Imported data passed whole-volume and scoped recursive fsck. Withholding its single backend block produced a failing scan identifying the file; restoring that same block returned the scan to success. An aged synthetic unreferenced4byte object was reported by check-only gc and retained byte-for-byte. fsck still passed with the leak present.

Reviewed pinned scan code for HEAD errors, presence-check limitations, recent-object skipping, retention and repair scope. No remote backend, live FUSE workload, concurrent writer, authorization failure, destructive cleanup or directory repair was tested. Seven-node/five-edge Mermaid and shell syntax reviewed; no diagram rendering. Social image visually reviewed. Sources linked inline and in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
