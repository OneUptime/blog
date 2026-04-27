# Validation Summary: Using tofu state list in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (state file compatibility)
- Resource addressing syntax
- jq (for parsing JSON output)
- Bash scripting

## Sources Consulted
- OpenTofu `state list` command reference: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu resource addressing reference: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu `show` command reference: https://opentofu.org/docs/cli/commands/show/
- Terraform JSON output format spec: https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found

1. **Wildcard syntax in resource address filters (incorrect).** The original post used `tofu state list 'aws_instance.*'`, `tofu state list 'module.networking.*'`, and `tofu state list 'module.database.*'`. The OpenTofu resource addressing grammar does not support `*` as a glob/wildcard — addresses are structured as `[module path][resource spec]` with optional `[index]` or `["key"]` instance keys. A trailing `.*` would be parsed as a literal resource name and either fail address parsing or match nothing.
   - **Fix:** Replaced module filters with the documented partial-address form (`'module.networking'`, `'module.database'`), which lists every resource inside that module per the official example. For the resource-type case, `aws_instance` alone is also not a valid address (a resource spec requires both type AND name), so the example was changed to (a) filter a specific resource block whose count/for_each surfaces multiple instances (`aws_instance.app`) and (b) added a `grep`-based recipe for filtering by type alone, since `state list` cannot do that with a bare type argument.

2. **Mislabeled comment.** The third filter example was labeled "Filter by resource type" but the command itself filtered by module path. Updated to "Filter to another module" to match the actual command behavior.

3. **"Finding Orphaned Resources" example was logically broken.** The original used `tofu show -json | jq -r '.values.root_module | .. | .resources? | .[]? | .address'` and claimed this produced the "current config" for comparison against `tofu state list`. In reality, `tofu show -json` (without a plan file) emits the *state* representation only — it has a `values` key but no `configuration` key. So the jq output and the `tofu state list` output are two views of the same state, and the `diff` would always be empty. This wouldn't actually find orphans.
   - **Fix:** Replaced with a plan-based approach: generate a plan, then use `jq` against `.resource_changes[]` filtering for `.change.actions == ["delete"]` to surface resources that exist in state but no longer in configuration. This matches the documented JSON plan format where `actions` is an array of strings such as `["delete"]`, `["create"]`, `["update"]`, `["no-op"]`, `["delete","create"]`, or `["create","delete"]`.

## Review Notes

- The `-state=path` flag in `tofu state list` is correctly documented and still current; left unchanged. Note: it is ignored when a remote backend is configured (also still accurate per docs).
- The shell script at the end of "Scripting with state list" labels its output as "By type", but the awk logic actually groups by `<type>.<name>` (it preserves the resource name after stripping `[...]` indices). This produces a useful per-resource-block count rather than a strict by-type count. Left unchanged because the script works as written; only the heading is slightly imprecise, which is a stylistic rather than technical issue.
- All addressing examples in the "Understanding Resource Addresses" section (count index, for_each key, nested modules, modules with for_each) are syntactically correct per the OpenTofu resource addressing grammar.
- The `tofu import aws_instance.legacy i-0123456789abcdef0` invocation is valid current syntax. (OpenTofu also supports the declarative `import` block, but the CLI form remains supported and is appropriate for this post's scope.)
