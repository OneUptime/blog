# Validation Summary: How to Export Graphs to DOT Format in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Graphviz
- DOT language
- Python
- Bash
- GitHub Actions

## Sources Consulted
- OpenTofu CLI docs, `tofu graph`: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu internals, resource graph behavior: https://opentofu.org/docs/v1.6/internals/graph/
- Graphviz DOT language reference: https://graphviz.org/doc/info/lang.html
- Bash Reference Manual, redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU Coreutils, `mkdir` invocation: https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html

## Issues Found
- The destroy graph example used `-type=destroy-plan`, which is not a supported OpenTofu graph type. I changed it to `-type=plan-destroy` to match the official `tofu graph` documentation.
- The sample DOT block used indented `#` comments. I changed them to `//` comments so the example uses standard DOT comment syntax documented by Graphviz.
- The module-context section implied that `-draw-cycles` includes module subgraphs. I corrected the example to use plain `tofu graph` for the full graph and clarified that `-draw-cycles` is specifically for highlighting cycle edges.
- The Python post-processing script appended `fillcolor` and `style` outside a DOT attribute list, which would produce invalid DOT. I changed it to append a second valid DOT attribute list to matching node declarations.
- The CI example wrote to `artifacts/graph.dot` without ensuring the `artifacts` directory exists. I added `mkdir -p artifacts` so the redirection step does not fail when the directory is absent.

## Review Notes
- `tofu graph` may require explicit root-module variable values when variables are used in module sources, backend configuration, or encryption blocks; the official docs call out this caveat.
- The GitHub Actions snippet is still a partial workflow fragment and assumes the runner already has repository checkout, OpenTofu, and Graphviz available.
- `tofu` and `dot` were not installed in the local review environment, so command and format validation was performed against official documentation rather than local binary execution.
