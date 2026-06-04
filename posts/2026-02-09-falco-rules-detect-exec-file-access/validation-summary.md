# Validation Summary: How to Write Falco Rules to Detect Suspicious Exec and File Access in Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Falco runtime security
- Falco rules, macros, fields, and condition operators
- Container process and file access monitoring

## Sources Consulted
- Falco rule condition syntax: https://falco.org/docs/concepts/rules/conditions/
- Falco rule basic elements: https://falco.org/docs/concepts/rules/basic-elements/
- Falco supported fields for conditions and outputs: https://falco.org/docs/reference/rules/supported-fields/
- Falco default macros: https://falco.org/docs/reference/rules/default-macros/
- Falco daemon CLI arguments, including rule validation: https://falco.org/docs/reference/daemon/cli-arguments/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The `Read Sensitive Files` rule used `fd.name in (...)` with wildcard paths such as `/home/*/.bash_history`. Falco's `in` operator performs exact membership, not glob matching, so those entries would not match home-directory paths. Changed the rule to keep exact paths in `in (...)` and use `fd.name glob ...` for wildcard home-directory paths.
- The `Exec in Production Namespace` rule said it alerted on any exec in production namespaces, but it required `proc.pname in (bash, sh, zsh)`, which would miss many direct `kubectl exec` commands and shell starts. Removed the parent-process filter so the rule matches spawned processes in the listed namespaces as described.
- The `Secret Volume Access` rule used `fd.name glob /secrets/*`, which only matches whole paths covered by that glob pattern. Changed it to `fd.name startswith /secrets/` so accesses below that mounted secret path are covered.
- The `SSL Certificate Access` rule used `fd.name glob *.pem`, `*.key`, and `*.crt`, which are not reliable for full file paths. Changed these checks to `fd.name endswith ...` and changed `/etc/ssl/*` to `fd.name startswith /etc/ssl/`.
- The performance examples were written as Falco rules but were missing required `desc`, `output`, and `priority` fields. Added those fields and changed the broad example from the undefined `open` macro to explicit open event types.

## Review Notes
- The examples depend on Falco's standard macros such as `spawned_process`, `open_read`, `open_write`, and `container`; this is valid when custom rules are loaded with the default Falco ruleset.
- Local validation: extracted YAML snippets were validated with `falco -V /etc/falco/falco_rules.yaml -V /tmp/falco_blog_rules_fixed.yaml` using the official `falcosecurity/falco-no-driver:latest` image. The current image reported Falco 0.39.2 and the extracted rules passed validation.
- The local environment did not have `kubectl` installed, so kubectl command forms were checked against the official Kubernetes references instead of local `kubectl --help`.
