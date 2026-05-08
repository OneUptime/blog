# Validation Summary: Parsing Output from Cilium Agent Hive Dot-Graph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium `cilium-agent hive dot-graph`
- Cilium Hive
- Uber Dig DOT visualization
- Graphviz DOT
- Python 3
- Shell scripting with `grep`, `awk`, `sed`, `perl`, `jq`, and `bc`

## Sources Consulted
- Cilium command reference for `cilium-agent hive dot-graph`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph/
- Cilium Hive Go package documentation: https://pkg.go.dev/github.com/cilium/hive
- Cilium Hive `PrintDotGraph` source, which calls `dig.Visualize`: https://raw.githubusercontent.com/cilium/hive/main/hive.go
- Uber Dig `Visualize` documentation: https://pkg.go.dev/go.uber.org/dig#Visualize
- Uber Dig DOT visualization source: https://raw.githubusercontent.com/uber-go/dig/master/visualize.go
- Graphviz DOT language reference: https://graphviz.org/doc/info/lang.html
- Local GNU `grep`, GNU `sed`, `mawk`, Python 3, and `jq` command help/version output

## Issues Found
- The original node regex only matched quoted node IDs with `label="..."`. Hive uses Uber Dig visualization output, which can include unquoted IDs such as `constructor_0`, labels after other attributes, and HTML-like labels such as `label=<...>`. Updated the shell and Python parsing examples to handle those forms.
- The original edge regex only matched edges where both endpoints were quoted. Dig output can emit edges such as `constructor_0 -> "type"` with an unquoted source ID. Updated the shell and Python edge parsing patterns.
- The original Python root and leaf calculations used only edge sources and targets, so labeled isolated nodes were excluded despite the comments saying roots have no incoming edges and leaves have no outgoing edges. Updated the calculations to use all parsed labeled nodes.
- The shell snippets used `jq` and `bc` without listing them as prerequisites. Added them, along with `perl`, which is now used for multi-line DOT label extraction.
- The average edge calculation could attempt division by zero when no nodes were found. Added a zero-node guard.
- The JSON report label extraction did not handle Dig's HTML-like or multi-line labels and could also count subgraph labels as components. Updated it to extract labels only from node statements.
- The troubleshooting note suggested escaping quotes before piping through `jq -R`, but `jq -R` already JSON-encodes raw strings. Replaced it with a more accurate note about `jq` availability and truncated DOT output.

## Review Notes
The examples are still regex-based and intentionally scoped to Cilium Hive/Uber Dig DOT output, not every legal DOT construct. For fully general DOT parsing, a real DOT parser such as `pydot` would be a stronger future improvement.
