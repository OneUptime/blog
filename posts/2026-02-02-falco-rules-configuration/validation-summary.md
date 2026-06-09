# Validation Summary: How to Configure Falco Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco (CNCF runtime security project)
- Falco rule definition language (YAML)
- Kubernetes (audit logs, Helm chart deployment)
- Falcosidekick (alert routing)
- Linux system calls (eBPF / kernel module)
- Prometheus / Grafana (metrics)

## Sources Consulted
- Falco rule basics: https://falco.org/docs/concepts/rules/basic-elements/
- Falco exceptions: https://falco.org/docs/concepts/rules/exceptions/
- Falco rule overrides: https://falco.org/docs/concepts/rules/overriding/
- Falco CLI reference: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco default macros: https://falco.org/docs/reference/rules/default-macros/
- Falco metrics: https://falco.org/docs/concepts/metrics/
- pmatch operator: https://falco.org/docs/rules/pmatch-operator/
- Replay events from files: https://falco.org/docs/install-operate/replay-events-from-files/
- Falco source (options.cpp): https://github.com/falcosecurity/falco/blob/master/userspace/falco/app/options.cpp
- Falco 1.0.0 breaking changes: https://github.com/falcosecurity/falco/issues/3038

## Issues Found

1. **"Seven priority levels" was incorrect.** The post claimed Falco supports seven priority levels but the table listed eight (EMERGENCY, ALERT, CRITICAL, ERROR, WARNING, NOTICE, INFORMATIONAL, DEBUG). Fixed the prose to say "eight priority levels."

2. **`spawned_process` macro definition was incomplete.** The custom macro used `evt.type = execve and evt.dir = <`, but Falco's default and recommended form covers both `execve` and `execveat` syscalls. Updated to `evt.type in (execve, execveat) and evt.dir = <`.

3. **Exceptions section used invalid Falco syntax.** The post showed top-level `- exception: <rule_name>` entries to attach values to a rule's exceptions, which is not a valid Falco rule construct. Per the official exceptions and overrides docs, exception values either live inline within the rule's `exceptions:` block, or they are added by re-declaring the rule and using the `override: { exceptions: append }` directive. Rewrote the example to use the supported `override:` pattern, and added the required `comps:` field to the exception field declarations (Falco needs comparison operators when fields are declared).

4. **`append: true` was deprecated.** Falco 0.36 deprecated the top-level `append: true` directive in favor of the more granular `override:` directive (e.g. `override: { condition: append }`, `override: { items: append }`). It is scheduled for removal in Falco 1.0.0. Updated the "Appending to Rules" examples (rule condition append and list items append) to use the modern `override:` form, and added a one-line note that `append: true` is deprecated.

5. **Invalid CLI flags in testing section.** The post used `--write`, `--read`, and `--stats-interval`, none of which are registered options in Falco's current CLI (see `userspace/falco/app/options.cpp`). The replay capability in modern Falco is configured via the engine, not a `--read` flag. Updated the capture command to use `sysdig -w` for capturing events and the Falco command to use `-o engine.kind=replay -o engine.replay.capture_file=...` for replay.

6. **`falco --validate` directory argument.** The post passed `/etc/falco/rules.d/` (a directory) to `--validate`, but `--validate` only accepts individual file paths. Updated the multi-validate example to pass explicit file paths.

## Review Notes

- The `proc.is_exe_from_memfd` field, `proc.aname[n]` indexed ancestor, `container.privileged`, `pmatch`, and `glob` operators were all verified as valid Falco constructs.
- The `metrics:` config block and the Prometheus `/metrics` endpoint exposed via the `webserver` block are accurate.
- The `metrics.interval: 15s` value uses a short cadence; production usage typically configures something longer (Prometheus-style duration strings like `1h` are also accepted), but `15s` is syntactically valid.
- The Falcosidekick example webhook URL and Helm install commands match the official charts and Falcosidekick configuration keys.
- The legacy `append: true` syntax still works in current Falco releases but emits a deprecation warning; the post now reflects the modern `override:` form and the migration window.
- The `condition: and not ...` pattern (leading `and`) is correct when appending to an existing rule's condition with `override: { condition: append }`.
