# Validation Summary: How to Render Dependency Graphs with Graphviz and OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Graphviz
- DOT graph rendering
- Makefile automation
- Python `http.server`

## Sources Consulted
- OpenTofu `graph` command: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu modules overview: https://opentofu.org/docs/language/modules/
- OpenTofu files and directories/root module behavior: https://opentofu.org/docs/language/files/
- OpenTofu resource graph internals: https://opentofu.org/docs/v1.6/internals/graph/
- Graphviz command-line reference: https://graphviz.org/doc/info/command.html
- Graphviz layout engines reference: https://graphviz.org/docs/layouts/
- Graphviz attributes reference (`size`, `ratio`, `dpi`): https://graphviz.org/doc/info/attrs.html
- Graphviz `page` attribute reference: https://graphviz.org/docs/attrs/page/

## Issues Found
- The Makefile example used `tofu graph -type=destroy-plan`, but the current OpenTofu documentation lists `plan-destroy` as the valid destroy-plan graph type. Updated the example to `-type=plan-destroy`.
- The text said `dot` shows the "apply order" clearly. OpenTofu documents `graph` as a dependency/execution graph, so I changed this to "dependency direction" to avoid overstating ordering guarantees.
- The PDF sizing note described `-Gsize="20,30"` as setting a fixed page size. Graphviz documents `size` as the maximum drawing size, not the PDF page size, so I corrected that wording.
- The scaling example used `-Gsize="24,18\\!"` while describing the result as fitting within a size. Graphviz documents the `!` suffix as changing `size` into a minimum desired size, so I removed it and kept the example aligned with the explanation.
- The styling example modified DOT with `sed`. I replaced it with Graphviz's documented `-G`, `-N`, and `-E` command-line attribute overrides, which are the supported way to apply graph, node, and edge defaults.
- The "Rendering Subgraphs for Modules" section implied that generic child module directories are safe `tofu graph` entrypoints. OpenTofu documents the working directory as the root module, so I corrected the section to refer to separate standalone root-module directories instead.

## Review Notes
- `tofu` and `dot` are not installed in this workspace, so OpenTofu and Graphviz commands could not be executed locally during review. Validation for those commands was done against the current official documentation instead.
- `python3 -m http.server` help output was available locally and is consistent with the example shown in the post.
