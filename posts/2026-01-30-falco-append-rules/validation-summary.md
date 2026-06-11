# Validation Summary: How to Implement Falco Append Rules

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Falco rules
- Falco rule overrides
- Falco CLI
- Kubernetes
- YAML configuration

## Sources Consulted
- Falco documentation: Overriding Rules - https://falco.org/docs/concepts/rules/overriding/
- Falco documentation: Default and Local Rules Files - https://falco.org/docs/concepts/rules/default-custom/
- Falco documentation: Basic Elements of Falco Rules - https://falco.org/docs/concepts/rules/basic-elements/
- Falco documentation: Falco Daemon Arguments - https://falco.org/docs/reference/daemon/cli-arguments/
- Falco official rules repository - https://github.com/falcosecurity/rules

## Issues Found
- The post used the deprecated top-level `append: true` key throughout. Updated the examples and explanations to use the current `override` section with `items: append`, `condition: append`, or `priority: replace`.
- The Falco configuration key was shown as `rules_file`. Updated it to the documented `rules_files` key.
- The CLI examples used invalid `falco --list=rules`, `falco --list=macros`, and `falco --list=lists` commands. Replaced them with `falco -L` and `falco -L -o json_output=true`.
- The validation command only validated the custom rules file, which can fail when append overrides reference definitions from the default rules. Updated it to validate the default rules file and the custom rules file together.
- Several custom lists were shown with append semantics even though the examples introduced them as new lists. Removed append overrides from those new custom list definitions.
- Updated current default rule names in the Kubernetes exception example to `Terminal shell in container` and `Read sensitive file untrusted`.
- The debug-priority example attempted to append a `priority` field. Updated it to use a replace override, since rule `priority` is replaceable, not appendable.

## Review Notes
The article is now aligned with current Falco documentation. Some examples remain environment-specific and assume the referenced upstream rules or placeholder macros are loaded before the local customization file.
