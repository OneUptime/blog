# Validation Summary: How to Use tofu graph to Visualize Dependencies

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu graph` command)
- Graphviz (`dot` rendering tool)
- DOT graph description language
- GitHub Actions (CI artifact upload)
- Shell utilities (`grep`)

## Sources Consulted
- OpenTofu CLI docs — `tofu graph`: https://opentofu.org/docs/cli/commands/graph/
- Graphviz JSON output format docs: https://graphviz.org/docs/outputs/json/
- Graphviz general output formats reference: https://graphviz.org/docs/outputs/

## Issues Found
- **Invalid `-type=destroy` flag value.** The "Graph Types" section listed `tofu graph -type=destroy` as a valid command and claimed it was equivalent to `-type=plan-destroy`. According to the official OpenTofu documentation, the only valid values for `-type` are `plan`, `plan-refresh-only`, `plan-destroy`, and `apply`. `destroy` is not a valid type and would error out. Fixed by removing the invalid `-type=destroy` example and replacing it with the actual valid options (`plan-destroy`, `plan-refresh-only`, `apply`).

## Review Notes
- The DOT output snippet in the "Basic Usage" section is illustrative and matches the actual structure produced by `tofu graph` (digraph wrapper, `compound`/`newrank` attributes, `[root]` prefix on node names, `subgraph "root"`, `[label = ..., shape = "box"]` node attributes, and `->` edges).
- The Graphviz install commands and `dot -Tpng` / `-Tsvg` / `-Tjson` invocations are all valid Graphviz output formats.
- The `-type=apply` value requires a plan file argument to be passed; the corrected example notes this in a comment for accuracy.
- The "Using with draw.io" section's comment mentions "using jq and a DOT parser" but the command itself just uses `dot -Tjson`, which is sufficient on its own — the comment is slightly misleading but not technically wrong, so it was left as-is to preserve the author's voice.
- The GitHub Actions snippet inside a bash code fence is a YAML fragment shown for illustration; this is a stylistic choice rather than a technical error.
