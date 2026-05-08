# Validation Summary: Troubleshooting Cilium Agent Hive Dot-Graph Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium agent and Hive
- Kubernetes `kubectl`
- Graphviz DOT, `dot`, `neato`, and `sfdp`
- Bash shell scripting
- Python 3 regular-expression parsing

## Sources Consulted
- Cilium command reference for `cilium-agent hive dot-graph`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph/
- Cilium v1.14 command reference for `cilium-agent hive dot-graph`: https://docs.cilium.io/en/v1.14/cmdref/cilium-agent_hive_dot-graph/
- Cilium Hive development guide: https://docs.cilium.io/en/stable/contributing/development/hive.html
- Cilium Hive source for `Command()` and `PrintDotGraph()`: https://github.com/cilium/hive/blob/v1.0.1/command.go and https://raw.githubusercontent.com/cilium/hive/v1.0.1/hive.go
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Graphviz `dot` layout documentation: https://graphviz.org/docs/layouts/dot/
- Graphviz `nslimit` attribute documentation: https://graphviz.org/docs/attrs/nslimit/
- Graphviz `mclimit` attribute documentation: https://graphviz.org/docs/attrs/mclimit/
- Go `dig.Visualize` documentation used by Cilium Hive: https://pkg.go.dev/go.uber.org/dig#Visualize

## Issues Found
- The malformed-output check used `grep -n "^[^\"{}digraph]"`, which is a character-class test rather than a test for lines outside DOT syntax. I changed it to an extended regular expression that flags lines not starting with expected DOT graph, brace, node, edge, or blank-line syntax.
- The DOT cleanup script used `\s` in `grep -E`, which is not portable POSIX ERE syntax. I changed it to `[[:space:]]`.
- The rendering section described Graphviz `nslimit` and `mclimit` as memory-limit settings. Graphviz documents them as layout iteration and crossing-minimization controls, so I changed the text and example to cap layout work rather than claim it increases memory limits.

## Review Notes
- `dot` is not installed in the local review environment, so I could not execute the Graphviz validation commands locally. The command forms and flags were checked against official Graphviz documentation instead.
- The command is present in current Cilium documentation and in the Cilium v1.14 command reference. Older Cilium documentation URLs with `.html` returned 404 unless the trailing-slash form was used.
