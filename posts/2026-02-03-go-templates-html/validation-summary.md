# Validation Summary: How to Use Go Templates for HTML Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go standard library `text/template` package
- Go standard library `html/template` package
- Go `net/http` for the web server example
- Mermaid diagrams for visualization
- Template actions: `if`/`else`, `range`, `with`, `define`, `template`
- Template variables, pipelines, and `FuncMap` custom functions
- Contextual auto-escaping safe types: `template.HTML`, `template.JS`, `template.JSStr`, `template.CSS`, `template.URL`, `template.Srcset`

## Sources Consulted
- Official `text/template` documentation: https://pkg.go.dev/text/template
- Official `html/template` documentation: https://pkg.go.dev/html/template
- Go source for `html/template` JS escaping (`jsStrReplacementTable` in `html/template/js.go`)
- Go pipeline semantics — "the result of each command is passed as the **last** argument of the following command" (text/template package docs, "Pipelines" section)
- Documentation for `template.FuncMap`, `template.Must`, `template.ParseFiles`, `template.ParseGlob`, `template.ExecuteTemplate`
- Documentation for contextual escaping safe types in `html/template`

## Issues Found

1. **`truncate` custom function parameter order was incompatible with its pipeline call site.**
   - The function was declared as `func(s string, maxLen int) string` but invoked in the template as `{{.Title | truncate 50}}`.
   - Per the official `text/template` pipeline rules, the piped value is passed as the **last** argument, so the call resolves to `truncate(50, .Title)`. With the original signature, `50` (int) would be bound to the `s string` parameter and `.Title` (string) to the `maxLen int` parameter — producing a runtime type error when `Execute` runs.
   - **Fix:** Swapped the parameter order to `func(maxLen int, s string) string` and added a brief comment explaining why this order is required for pipeline usage. The function body is unchanged.

2. **JS-context auto-escaping example used the wrong escape format in the Security mermaid diagram.**
   - The diagram showed `JS Context: \x3cscript\x3e...`, suggesting Go's `html/template` produces `\x` hex escapes for `<` and `>` in JavaScript string contexts.
   - In reality, Go's `html/template` JS string escaper (`jsStrReplacementTable` in `html/template/js.go`) maps `<` to `<` and `>` to `>` (Unicode escapes), not `\x3c`/`\x3e`.
   - **Fix:** Updated the diagram label to `JS Context: <script>...` to reflect what the package actually outputs.

## Review Notes

- The post explicitly states that the `html`, `js`, and `urlquery` template functions are available built-ins. These are technically inherited from `text/template` and remain callable in `html/template`, but in `html/template` they are usually redundant (and can lead to double-escaping) because the package's contextual auto-escaping already handles HTML, JS, and URL contexts. The post is not wrong, but a future revision could note this caveat.
- The "When You Need Raw HTML" output sample shows HTML comments in the rendered output. Note that `html/template` is allowed to strip HTML comments from template text (an intentional security feature to avoid leaking sensitive author-only notes). The author also shows the output comments using shortened, paraphrased text rather than the literal template comments, so this section is illustrative rather than a verbatim execution trace. Not flagged as a technical error, but worth being aware of.
- The complete example uses `{{define "home.html"}}...{{end}}` inside a file already named `home.html` (loaded via `ParseGlob`). This works because the `define` block replaces the file-based associated template of the same name, but it is an unusual pattern — most idiomatic Go code either omits the `define` in the main file body or uses a different name (e.g., `{{define "content"}}`). Functionally correct, so left as-is.
- The `eq` built-in is described as "Returns true if args are equal". This is accurate for the typical two-argument case shown; the package actually supports `eq arg1 arg2 [arg3...]` to test equality of `arg1` against any of the remaining args. Minor imprecision, not flagged.
- The `truncate` implementation will panic for `maxLen < 3` due to the `s[:maxLen-3]` slice. Acceptable for a tutorial example with `maxLen` of 50.
