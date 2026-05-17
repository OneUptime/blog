# Validation Summary: How to Use the split Command to Divide Large Files on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GNU coreutils `split` command
- Bash shell
- Ubuntu / Linux
- Related utilities: `cat`, `wc`, `md5sum`, `sha256sum`, `pv`, `tar`, `scp`, `pg_dump`

## Sources Consulted
- `split --help` output (GNU coreutils 9.x on Ubuntu)
- GNU coreutils online manual: https://www.gnu.org/software/coreutils/split
- GNU coreutils size argument documentation (K vs KB, M vs MB unit conventions)

## Issues Found
No technical issues found.

All technical claims verified against the actual `split --help` output and GNU coreutils documentation:
- Default prefix is `x` and default suffix length is 2 ✓
- Default line count is 1000 lines ✓
- `-b` for byte-based splits ✓
- `-l` for line-count splits ✓
- `-n N` for N-chunk splits, `-n l/N` for line-aligned N-chunk splits, `-n l/K/N` for outputting chunk K of N to stdout ✓
- `-d` for numeric suffixes (starting at 0) ✓
- `-a` for custom suffix length ✓
- Size suffix conventions: `K`/`M`/`G` are powers of 1024, `KB`/`MB` are powers of 1000 ✓
- Reading from stdin via `-` ✓
- All reassembly examples using `cat` with sorted glob expansion are correct ✓
- The CSV header-preservation workaround and parallel processing pattern is sound shell scripting ✓

## Review Notes
- The default suffix length of 2 (giving 676 possible alphabetic combinations) means `-n 5 chunk_` produces `chunk_aa` through `chunk_ae`. The post implies this correctly without spelling it out.
- The `cat $(ls chunk_* | sort)` example is technically redundant since shell glob expansion is already sorted lexicographically, but it is not incorrect and the post frames it as "safer" which is a reasonable defensive habit.
- The `-b 25M -d -a 2 report_part_` example caps at 100 chunks (00-99); split will error if exceeded. This is fine for the 25MB-per-piece email use case but worth knowing as a caveat.
- The `r/N` and `r/K/N` round-robin distribution modes for `-n` exist but are not covered — this is a reasonable scope decision since they are uncommon.
- The `b` suffix (512 bytes) and `C` (line-bytes) option are also not covered, again a reasonable scope choice for an introductory tutorial.
