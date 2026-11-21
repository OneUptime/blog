# Validation summary

Reviewed Microsoft GC-mode/configuration, processor-count, active-GC and override documentation plus Kubernetes resource semantics. Built net10.0 probe with explicit server/workstation properties using SDK10.0.404. Verified generated runtimeconfig and four separate executions under .NET10.0.15 macOS ARM64 with processor overrides1/2.

Observed requested server mode falling back to workstation at one reported processor. This checks startup selection, not CPU quota behavior or performance. No Linux container, service benchmark, DATAS adaptation or rollout tested. Seven-node seven-edge Mermaid structurally reviewed without rendering. Generated1280x720 image visually inspected and readable.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
