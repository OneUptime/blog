# Validation Summary: How to Explain .NET Pod Memory Growth with a Small Managed Heap

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

.NET, Kubernetes

## Sources Consulted

- https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak
- https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters
- https://learn.microsoft.com/en-us/dotnet/core/runtime-config/garbage-collector
- https://docs.kernel.org/admin-guide/cgroup-v2.html

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Reviewed Microsoft diagnostics and GC configuration plus kernel accounting; shell syntax checked. No .NET process was attached or dump collected.
