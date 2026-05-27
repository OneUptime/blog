# Validation Summary: How to Configure Kubernetes Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging
- kube-apiserver audit policy and audit backends
- Kubernetes audit.k8s.io/v1 API
- Kubernetes kubeconfig-style webhook configuration
- Python JSON-lines log processing
- Fluentd/Filebeat and Elasticsearch log shipping

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver Audit Configuration v1 reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes kubeconfig concept documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/

## Issues Found
- The kube-apiserver flag comment for `--audit-log-maxage=30` incorrectly said "Rotate daily". Kubernetes documents this flag as the maximum number of days to retain old audit log files, while size-based rotation is controlled by `--audit-log-maxsize`. Updated the comment to "Retain rotated audit logs for 30 days."
- The Python analyzer used `event.get("sourceIPs", ["unknown"])[0]`, which can raise `IndexError` if an audit event contains an empty `sourceIPs` list. Updated it to `(event.get("sourceIPs") or ["unknown"])[0]` so the sample remains safe for missing or empty source IP data.

## Review Notes
The audit policy API version, policy fields, audit levels, resource/subresource matching, log backend flags, webhook backend flags, and JSON-lines log format match the current Kubernetes documentation. The webhook configuration is a kubeconfig-style example; production deployments should add the authentication material required by the receiver.
