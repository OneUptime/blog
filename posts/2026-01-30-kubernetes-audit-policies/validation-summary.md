# Validation Summary: How to Create Kubernetes Audit Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes audit policies (`audit.k8s.io/v1`)
- `kube-apiserver` audit log and webhook backends
- kubeadm static Pod manifest configuration
- kubectl
- jq
- Fluent Bit HTTP input and Elasticsearch output

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-apiserver Audit Configuration API (`audit.k8s.io/v1`): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Node Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/node/
- Fluent Bit TLS documentation: https://docs.fluentbit.io/manual/4.0/administration/transport-security
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch

## Issues Found
- The introduction said Kubernetes audit logs record every API server request and create an immutable trail. Kubernetes auditing records events according to the configured policy and backend, and Kubernetes does not by itself make log files immutable. Updated the wording to say audit logs can record requests according to policy and create an audit trail.
- The audit level table implied `Request` and `RequestResponse` always include request and response bodies. Kubernetes omits request and response objects for non-resource requests. Updated the table to specify that bodies apply to resource requests.
- One policy rule matched kubelet activity with `users: ["kubelet"]`. Modern kubelets normally authenticate as `system:node:<nodeName>` in the `system:nodes` group. Updated the rule and comment to match on `userGroups: ["system:nodes"]`.
- The Fluent Bit webhook receiver example used `tls.cert_file` in classic `.conf` format. Fluent Bit classic configuration uses `tls.crt_file`. Updated the field name.
- The Fluent Bit Elasticsearch output used `Name elasticsearch`; the official output plugin name is `es`. Updated the output plugin name.
- The sample audit event had a typo in `auditID` (`a]b1...`). Corrected it to a plausible UID-style value.

## Review Notes
- The compliance policy's kubelet node status rule is redundant because an earlier `system:nodes` read rule already matches those requests. It remains syntactically valid and harmless, so it was left in place to avoid restructuring the example.
- The webhook receiver is intentionally minimal. Production deployments should verify the receiver's exact request/response behavior, authentication, TLS trust chain, buffering, and downstream indexing before relying on it for audit retention.
