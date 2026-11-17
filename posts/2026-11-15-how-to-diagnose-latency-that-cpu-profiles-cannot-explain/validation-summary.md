# Validation Summary: How to Diagnose Latency That CPU Profiles Cannot Explain

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

Profiling, Linux

## Sources Consulted

- https://raw.githubusercontent.com/iovisor/bcc/master/tools/offcputime_example.txt
- https://raw.githubusercontent.com/torvalds/linux/master/tools/perf/Documentation/perf-record.adoc
- https://docs.kernel.org/accounting/psi.html

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Reviewed perf and BCC measurement semantics; shell syntax checked. No privileged profiling or kernel pressure reads were performed.
