# Validation Summary: How to Create Falco Rule Conditions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Falco runtime security
- Falco rule conditions
- Falco macros and lists
- Falco CLI
- Kubernetes and container detection metadata
- Docker test commands

## Sources Consulted
- Falco Condition Syntax: https://falco.org/docs/concepts/rules/conditions/
- Falco Basic Elements of Rules: https://falco.org/docs/concepts/rules/basic-elements/
- Falco Default Macros: https://falco.org/docs/reference/rules/default-macros/
- Falco Supported Fields for Conditions and Outputs: https://falco.org/docs/reference/rules/supported-fields/
- Falco Supported Events: https://falco.org/docs/reference/rules/supported-events/
- Falco Daemon Arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco Overriding Rules: https://falco.org/docs/concepts/rules/overriding/
- Falco configuration comments for replay capture files: https://github.com/falcosecurity/falco/blob/master/falco.yaml

## Issues Found
- The post used `evt.dir = <` in several rules and macros. Falco 0.42.0 deprecated `evt.dir`; current docs say `evt.dir='<'` now matches everything with a warning and the field will be removed later. Removed the direction checks from the examples and macros.
- The outbound connection macro was too narrow and relied on the deprecated direction field. Updated it to use current field checks for IPv4/IPv6 network file descriptors, non-loopback traffic, and successful or in-progress connection results.
- The list appending example used deprecated `append: true`. Updated it to use `override: items: append`.
- The rule evaluation flow described macros and lists as if they were evaluated as separate runtime steps. Updated the wording and diagram to clarify that macros and lists are resolved when rules are loaded.
- The performance tip claimed macros reduce parsing overhead. Updated it to state the accurate benefit: keeping shared conditions consistent and readable.
- The credential file list included `/home/*/.aws/credentials` but used `fd.name in (credential_files)`, which treats that wildcard as a literal list item. Moved the wildcard path to an explicit `glob` condition.
- The container drift rule mixed `and` and `or` without parentheses, so it would not apply the container and process exclusions to every path pattern. Added parentheses around the file path alternatives.
- The `container_started` macro used `evt.dir = <` even though the `container` metaevent is documented with direction `>`, and `evt.dir` is deprecated. Removed the direction check.
- The capture-file test command used `-e test_events.scap`, which is not documented in the current Falco CLI arguments. Updated it to the documented replay-engine configuration: `-o engine.kind=replay -o replay.capture_file=test_events.scap`.

## Review Notes
Falco was not installed in the local environment, so CLI verification was performed against the official Falco daemon argument documentation rather than local `falco --help` output.
