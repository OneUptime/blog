# Validation Summary: How to Configure Runtime Security Monitoring with Falco Custom Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco runtime security
- Falco custom rules, macros, exceptions, and rule validation
- Kubernetes
- Helm
- Kubernetes audit events and the Falco k8saudit event source
- Docker

## Sources Consulted
- Falco rules concepts and rule structure: https://falco.org/docs/concepts/rules/
- Falco custom ruleset documentation: https://falco.org/docs/concepts/rules/custom-ruleset/
- Falco default and local rules files: https://falco.org/docs/concepts/rules/default-custom/
- Falco Kubernetes Helm quickstart/setup documentation: https://falco.org/docs/getting-started/falco-kubernetes-quickstart/
- Falco supported fields reference: https://falco.org/docs/reference/rules/supported-fields/
- Falco default macros reference: https://falco.org/docs/reference/rules/default-macros/
- Falco rule exceptions documentation: https://falco.org/docs/rules/exceptions
- Falco Kubernetes audit events documentation: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco event sources documentation: https://falco.org/docs/concepts/event-sources/
- Falco registered plugins documentation: https://falco.org/docs/concepts/plugins/registered-plugins/
- falcoctl official repository and current CLI documentation: https://github.com/falcosecurity/falcoctl
- Falco 0.44.0 container CLI help and `falco -V` rule validation output.

## Issues Found
- The installation section used an incomplete hand-written DaemonSet, referenced missing `ServiceAccount`/ConfigMap resources, mounted only the Docker socket, and pinned the outdated `falcosecurity/falco:0.36.0` image. Replaced it with the current official Helm installation flow.
- The custom rules sections used standalone Kubernetes ConfigMaps plus manual DaemonSet mounts. Updated them to the official Helm `customRules` values format, which Falco mounts under `/etc/falco/rules.d`.
- The basic rule anatomy example referenced undefined macros (`system_call` and `suspicious_activity`). Replaced it with a syntactically valid rule using Falco default macros and fields.
- The `Write to System Directory` rule mixed `and`/`or` without parentheses, which broadened the condition beyond containers. Added grouping around the file path checks.
- The outbound database rule used `fd.sip` when checking the remote endpoint. Changed it to `fd.rip` to match the destination IP used in the output.
- The Kubernetes service account rule used nonexistent field `k8s.sa.name`. Reworked it into a valid service account token read rule using supported syscall fields.
- The service account secret access description overstated what Falco could infer from `proc.name`; clarified that it detects unexpected token reads.
- The k8s audit rule lacked a note that the `k8s_audit` source requires the k8saudit plugin and Kubernetes audit events. Added that caveat.
- Custom macro names collided with default Falco list names such as `shell_binaries` and `package_managers`, causing validation failures. Renamed them to `custom_shell_binaries` and `custom_package_managers`.
- The testing section used stale `falcoctl rules validate` and `falcoctl rules test` commands. Replaced them with current `falco -V` validation commands and a container-based validation option.
- The tuning example referenced a macro from a previous snippet and failed as a standalone rule example. Changed it to use Falco's built-in `shell_binaries` list directly.

## Review Notes
- Extracted rule examples were validated with `docker run --rm falcosecurity/falco:0.44.0 falco -V /etc/falco/falco_rules.yaml -V <rules-file>`. All extracted rule blocks pass validation; remaining warnings are expected for an unloaded `k8s_audit` source in the base Falco container and for illustrative unused macros.
- The Kubernetes audit example is syntactically consistent with Falco's `k8s_audit` source, but it requires a configured k8saudit-compatible plugin and Kubernetes audit log delivery before it will run.
