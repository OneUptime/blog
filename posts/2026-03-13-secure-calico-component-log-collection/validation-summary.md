# Validation Summary: How to Secure Calico Component Log Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Tigera Operator-based install, `calico-system` namespace)
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding, Role, RoleBinding)
- Fluent Bit (Elasticsearch output plugin, Lua filter)
- Elasticsearch (as the log aggregation backend)
- TLS (for log transport encryption)
- Lua (pattern matching for field masking)
- Mermaid (architecture diagram)

## Sources Consulted
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API for `pods/log` subresource: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#read-log-pod-v1-core
- Calico (Tigera Operator) namespace conventions: https://docs.tigera.io/calico/latest/operations/install-resource-requirements (and related operator docs that place components in `calico-system`)
- Fluent Bit Elasticsearch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit TLS/SSL configuration: https://docs.fluentbit.io/manual/administration/transport-security
- Fluent Bit Lua filter: https://docs.fluentbit.io/manual/pipeline/filters/lua
- Lua 5.1 string patterns (used by Fluent Bit): https://www.lua.org/manual/5.1/manual.html#5.4.1
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

Verified specifically:
- The ClusterRole resources `pods`, `namespaces`, and `pods/log` with verbs `get/list/watch` (and `get` for `pods/log`) match what the Fluent Bit Kubernetes filter requires to discover pods and read their log streams via the Kubernetes API.
- The Role/RoleBinding correctly scopes `pods/log` access to the `calico-system` namespace and binds it to a Group subject — valid RBAC when an OIDC/auth proxy supplies group claims.
- The Fluent Bit Elasticsearch output directives (`Name`, `Match`, `Host`, `Port`, `TLS`, `TLS.Verify`, `TLS.CA_File`, `HTTP_User`, `HTTP_Passwd`) are all valid property names accepted by the plugin. Fluent Bit configuration keys are case-insensitive, so the capitalized forms used here work. Environment variable substitution via `${VAR}` is supported.
- The Lua filter signature `function name(tag, timestamp, record)` and the return convention `return code, timestamp, record` (where `1` means "record modified") match the Fluent Bit Lua filter contract.
- The Lua pattern `%d+%.%d+%.%d+%.%d+` is valid Lua pattern syntax for matching IPv4-shaped strings.
- The Mermaid flowchart syntax (`flowchart LR`, edge labels with `|...|`, `\n` for in-node line breaks) is valid.

## Review Notes
- The `\n` line break inside the Mermaid node label `C[Fluent Bit\nServiceAccount]` is supported but newer Mermaid versions also accept `<br/>`; either renders correctly.
- The Lua IPv4 mask is purely shape-based (`d+.d+.d+.d+`), so it will also match version-like or other dotted-number strings; this is a reasonable trade-off the author implicitly accepts and is acceptable for a security-oriented mask (over-mask rather than under-mask).
- The `calico-system` namespace is the Tigera Operator default; users on manifest-based ("calicoctl"-style) installs may have Calico components in `kube-system` instead and would need to adjust the Role namespace accordingly. The post implicitly assumes the operator install, which is the documented current path.
- The post sets `HTTP_Passwd` via an environment variable, which is good practice; consumers should source that variable from a Kubernetes Secret rather than embedding it in the ConfigMap.
