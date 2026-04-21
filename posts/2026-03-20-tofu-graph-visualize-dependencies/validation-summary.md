# Validation Summary: How to Use tofu graph to Visualize Dependencies - Tofu Visualize Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI (`tofu graph`)
- Graphviz DOT rendering (`dot`, `unflatten`)
- Shell commands for generating and opening dependency graph artifacts
- Online DOT visualization

## Sources Consulted
- OpenTofu Command: graph documentation — https://opentofu.org/docs/cli/commands/graph/
- OpenTofu Resource Graph internals — https://opentofu.org/docs/internals/graph/
- Graphviz command-line documentation — https://graphviz.org/doc/info/command.html
- Graphviz download/install documentation — https://graphviz.org/download/
- Graphviz `unflatten` manual — https://graphviz.org/pdf/unflatten.1.pdf
- Graphviz `rankdir` attribute documentation — https://graphviz.org/docs/attrs/rankdir/
- Graphviz Online — https://dreampuf.github.io/GraphvizOnline/
- PyPI package lookup for `blast2dot` via `python3 -m pip index versions blast2dot`

## Issues Found
- **Invalid graph type**: The post used `tofu graph -type=destroy-complete`, but the current OpenTofu documentation lists only `plan`, `plan-refresh-only`, `plan-destroy`, and `apply` as valid graph types. Replaced it with `tofu graph -type=plan-refresh-only` so the examples cover a valid OpenTofu graph type.
- **Deprecated module-depth usage**: The post recommended `tofu graph -module-depth=2` and `tofu graph -module-depth=1`. OpenTofu documents `-module-depth=n` as deprecated, so those examples were replaced with current `tofu graph` and `grep` examples for rendering or inspecting module-related DOT output.
- **Nonexistent `blast2dot` package**: The post recommended `pip install blast2dot` and piping through `blast2dot`, but PyPI lookup returned no matching distribution. Replaced the section with a supported Graphviz layout option using `dot -Grankdir=LR`.
- **Graphviz install command**: Updated the Ubuntu/Debian install command from `apt-get install graphviz` to the Graphviz-documented `sudo apt install graphviz`.
- **Misleading `-draw-cycles` heading**: The section title described `-draw-cycles` as filtering, but OpenTofu documents it as highlighting cycles with colored edges. Renamed the section to "Highlighting with -draw-cycles".

## Review Notes
- The core description of `tofu graph` producing DOT output is correct.
- The `dot -Tpng`, `dot -Tsvg`, `unflatten -l 10`, `tofu graph -draw-cycles`, and `tofu graph -type=plan` / `apply` / `plan-destroy` examples are consistent with the consulted documentation.
- The arrow direction explanation is consistent with OpenTofu's dependency graph documentation, where references create dependencies from the referencing resource to the referenced resource.
