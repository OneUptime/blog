# Validation Summary: How to Debug Falco Rule Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Falco (runtime security tool)
- Falco rules engine (YAML rule syntax, macros, lists, exceptions)
- `falco` CLI (validation, field listing, dry-run, trace replay)
- `falco-driver-loader` / driver internals
- Falco metrics endpoint and embedded webserver (port 8765)
- Kubernetes (`kubectl` commands for log inspection and rule deployment)
- `jq` for filtering JSON logs

## Sources Consulted
- Falco official docs: https://falco.org/docs/
- Falco CLI options source: https://github.com/falcosecurity/falco/blob/master/userspace/falco/app/options.cpp
- Falco default `falco.yaml`: https://raw.githubusercontent.com/falcosecurity/falco/master/falco.yaml
- Falco rules overriding docs: https://falco.org/docs/concepts/rules/overriding/
- Falco 0.37.0 release notes: https://falco.org/blog/falco-0-37-0/
- Falco metrics docs: https://falco.org/docs/concepts/metrics/
- Falco default macros: https://falco.org/docs/reference/rules/default-macros/
- Default rules in falcosecurity/rules repo: https://github.com/falcosecurity/rules/blob/main/rules/falco_rules.yaml
- Kernel event source docs: https://falco.org/docs/concepts/event-sources/kernel/

## Issues Found
1. **`falco -V` mislabeled as "verbose"** — The post described `-V` as a verbose flag. In Falco, `-V` is actually the short form of `--validate`. Fixed by relabeling the example as "Short form of --validate".
2. **Invalid `--validate ... -r ...` combination** — `--validate` exits after validating its argument; the `-r` flag is for normal runtime loading and does not chain with `--validate`. Replaced with the correct repeated-flag form: `falco --validate file1 --validate file2`.
3. **`falco --list=fields` is not valid syntax** — Falco's flag is `--list[=SOURCE]` where the optional argument is a source name (e.g., `syscall`), not the literal word `fields`. Replaced the three example commands with `falco --list`, `falco --list=syscall`, and `falco --list | grep container`. Also removed the made-up `--list-source-fields=syscall` chained form.
4. **`rules_debug: enabled: true` is not a real config key** — Falco has no `rules_debug` section in `falco.yaml`. Replaced with `log_stderr: true` / `log_syslog: false`, which are real options that complement `log_level: debug` for visibility into rule loading.
5. **`falco-driver-loader status` is not a valid subcommand** — `falco-driver-loader` only takes driver-type args (`kmod`, `bpf`, `modern-bpf`) plus options like `--clean`; there is no `status` subcommand. Replaced with `falco --version`, which surfaces driver/version info from inside the pod.
6. **Deprecated `append: true` rule syntax** — Deprecated in Falco 0.37 and slated for removal in 1.0. Updated all three rule-extension examples to use the current `override: { condition: append }` syntax and added a short note explaining the deprecation.

## Review Notes
- Verified correct: `container.image.repository` (vs. invalid `container.image.name`), `evt.is_open_read` field, the `open_read` macro, the `shell_procs` macro reference, the `container` macro (`container.id != host`), the `metrics` section keys (`enabled`, `output_rule`, `rules_counters_enabled`), and port 8765 as Falco's embedded webserver port (where `/metrics` is served when `webserver.prometheus_metrics_enabled` is true).
- The example for "Validate rules inside container" still uses `falco --validate` correctly.
- The example `kubectl run ... --rm -it ... wget google.com` for testing outbound network connections is fine for an interactive smoke test; in newer Kubernetes versions, `--rm -it` with a non-shell entrypoint can be a bit fragile, but the form shown will work for the intended demonstration.
- Future improvement (not a correctness issue): the post could mention `falcoctl driver` as the modern replacement for `falco-driver-loader`, which is being deprecated in favor of `falcoctl`.
