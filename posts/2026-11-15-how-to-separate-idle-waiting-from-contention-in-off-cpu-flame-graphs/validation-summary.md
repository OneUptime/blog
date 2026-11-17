# Validation Summary: How to Separate Idle Waiting from Contention in Off-CPU Flame Graphs

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Profiling, Linux

## Sources Consulted

- https://raw.githubusercontent.com/iovisor/bcc/master/tools/offcputime_example.txt
- https://docs.kernel.org/accounting/psi.html

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Python examples parsed with Python ast; no external services were contacted.
- Parsed arithmetic and shell syntax; BCC off-CPU aggregation semantics reviewed. No off-CPU capture or live thread inspection was performed.
- Executed 1 Python example(s) locally using their embedded illustrative inputs; all completed successfully. This did not exercise a telemetry backend or production workload.
