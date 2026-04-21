# Validation Summary: How to Use the tofu graph Command

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- OpenTofu CLI
- `tofu graph`
- Graphviz DOT and `dot`
- GitHub Actions
- Blast Radius

## Sources Consulted
- OpenTofu `tofu graph` command documentation: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu inspecting infrastructure documentation: https://opentofu.org/docs/cli/inspect/
- OpenTofu resource graph internals: https://opentofu.org/docs/internals/graph/
- OpenTofu `tofu validate` command documentation: https://opentofu.org/docs/cli/commands/validate/
- Graphviz command-line documentation: https://graphviz.org/doc/info/command.html
- Graphviz output formats documentation: https://graphviz.gitlab.io/docs/outputs/
- `opentofu/setup-opentofu` GitHub Action README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` README: https://github.com/actions/checkout
- `actions/upload-artifact` README: https://github.com/actions/upload-artifact
- Blast Radius README and CLI source: https://github.com/28mm/blast-radius
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post used `tofu graph -type=destroy`, but OpenTofu documents `plan-destroy` as the destroy graph type. Changed the command to `tofu graph -type=plan-destroy`.
- The post described `-plan` as showing only resources that would change. OpenTofu documents `-plan=tfplan` as rendering the graph from a saved plan file. Updated the wording to avoid overclaiming the output filter behavior.
- The module graph example used `-draw-cycles` and claimed it collapses module internals. `-draw-cycles` highlights cycles; it does not collapse modules. Updated the section to say module paths are included in node names and render the graph normally.
- The database filtering example piped raw `grep` output into `dot`, which would drop required DOT structure lines. Updated it to either inspect matching lines or preserve DOT wrapper lines before rendering.
- The CI snippet assumed OpenTofu and Graphviz were already available. Added checkout, OpenTofu setup, and Graphviz installation steps, and updated the GitHub Actions examples to current documented action majors.
- The Blast Radius package name was incorrect. Changed `pip install blast-radius` to `pip install blastradius`.
- The Blast Radius HTML export command was unsupported. Replaced it with the documented `--svg` output mode and noted that interactive server mode expects the Terraform CLI.

## Review Notes
The local environment did not have `tofu` or `dot` installed, so CLI behavior was validated against official documentation and authoritative project sources rather than executed locally.
