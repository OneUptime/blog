# Validation summary

Reviewed single-stack CDKTF diff semantics against tagged0.21.0 source and the manifest schema. The collector uses Terraform detailed exit codes directly and keeps failed plans distinct from proposed changes.

## Executed checks

Executed the exact article script against three initialized, resource-free CDKTF stacks. Terraform1.11.4 produced0/1/2 for unchanged/error/changes; collection continued beyond the error and wrote all rows before exiting1. Supplying the missing input changed the run to0/2/2 and the collector exited0. Markdown, JSON and per-stack logs matched the article. Python compilation, Bash syntax and the six-node/six-edge Mermaid structure passed.

## Limits

No apply, cloud infrastructure, remote backend, CI upload or dependency orchestration was exercised. The script requires approved initialization and runtime inputs and does not handle per-stack credential isolation automatically. Forced termination may prevent a final report. Mermaid was not browser-rendered. Sources are linked beside claims and listed in validation.json.

The generated1280x720 social image was visually reviewed; the full title is readable and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
