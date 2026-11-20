# Validation summary

Python 3.11.13 executed the published probe locally on macOS with one and 1000 files. Both runs produced seven correctly ordered records, correct file counts and nonnegative durations. Temporary directories were cleaned. Out-of-range counts were rejected. The published Python matches the executed fixture; the invocation passed Bash syntax checking.

Reviewed Python directory-entry caching, explicit stat calls, elapsed-time measurement and temporary-directory behavior. Reviewed GNU listing semantics, Linux NFS cache options and the IOR project description.

No remote filesystem, parallel workload, cold-cache, durability, deletion-performance or product benchmark was performed. Results establish fixture operation only. The article explicitly explains those limitations. A phase comparison table provides the needed visual structure.

## Checked sources

- https://man7.org/linux/man-pages/man1/ls.1.html
- https://docs.python.org/3.11/library/tempfile.html
- https://docs.python.org/3.11/library/time.html#time.perf_counter
- https://docs.python.org/3.11/library/os.html#os.scandir
- https://ior.readthedocs.io/en/latest/
- https://man7.org/linux/man-pages/man5/nfs.5.html

The generated social image was visually inspected. The title is readable and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
