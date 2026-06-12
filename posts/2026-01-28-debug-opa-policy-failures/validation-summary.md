# Validation Summary: How to Debug OPA Policy Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego policy language (rego.v1 syntax)
- OPA REPL and CLI (`opa run`, `opa eval`, `opa test`, `opa check`)
- OPA HTTP API (decision endpoint, `explain` parameter)
- OPA decision logs
- OPA VS Code extension (tsandall.opa)
- curl, jq
- Mermaid diagrams

## Sources Consulted
- OPA CLI Reference: https://www.openpolicyagent.org/docs/cli
- OPA Debugging documentation: https://www.openpolicyagent.org/docs/debugging
- OPA `print` built-in: https://www.openpolicyagent.org/docs/policy-reference/builtins/opa
- OPA Decision Logs: https://www.openpolicyagent.org/docs/management-decision-logs
- "Introducing the OPA print function" (OPA blog): https://blog.openpolicyagent.org/introducing-the-opa-print-function-809da6a13aee
- OPA source: `cmd/eval.go` and `cmd/run.go` in https://github.com/open-policy-agent/opa
- vscode-opa extension package.json: https://github.com/open-policy-agent/vscode-opa/blob/main/package.json
- curl release notes for `--url-query` (curl 7.87.0, Dec 2022)

## Issues Found

1. **Wrong flag for enabling print statements (incorrect).** The post claimed `opa run --server --set=decision_logs.console=true` enables `print()` output. That flag actually enables console output of decision logs, which is a different feature. In reality, `print()` is on by default in `opa eval` and the REPL (output to stderr); in server mode it goes through the OPA logger. Replaced the example with the correct `opa eval` behavior and added `opa run --server --log-level=info --log-format=text` for server-mode print visibility.

2. **Invalid REPL-to-remote-server command (incorrect).** The post showed `opa run --server &` followed by `opa run -s http://localhost:8181`, suggesting the second command connects the REPL to a running server. `-s` is short for `--server` (starts a server); it does not connect to one, and OPA has no built-in REPL-attach-to-remote feature. Removed the invalid command and added a note that remote OPA servers are queried via the HTTP API.

3. **curl `--url-query` portability concern (minor).** `--url-query` was added in curl 7.87.0 (Dec 2022) and is not available on many LTS distros. Switched the trace example to put `?explain=full` directly in the URL, which works on all curl versions.

## Review Notes

- The Rego code samples (rules, comprehensions, `with input as`, `with data as`, comprehensions, `to_number`, `is_array`, `type_name`, `object.keys`) are syntactically correct and use the modern `rego.v1` syntax consistently.
- The trace output example uses the correct event names (`Enter`, `Eval`, `Index`, `Fail`, `Redo`, `Exit`).
- The decision log `jq` filter `select(.result == false ...)` is correct *for the specific case of querying a boolean `allow` rule with `default allow := false`* (which is what this post uses). Readers querying package-level paths or `deny` sets would need a different filter shape, but flagging this is beyond a strict correctness fix.
- The OPA REPL prompt in the session example is illustrative; actual REPL output formatting can vary slightly across versions but is close enough to be representative.
- The OPA version shown in the REPL example (0.60.0) is older than the current release line (OPA 1.x), but is consistent with the `rego.v1` import shown (introduced in 0.59 as a pre-1.0 opt-in), so it was left as-is.
- VS Code extension settings `opa.roots` and `opa.bundleMode` were verified to be real settings in the current `tsandall.opa` extension.
