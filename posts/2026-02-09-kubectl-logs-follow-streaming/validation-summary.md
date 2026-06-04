# Validation Summary: How to Use Log Streaming with kubectl logs --follow for Real-Time Debugging

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes pod and container logging

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/

## Issues Found
No technical issues found.

## Review Notes
The local environment does not have kubectl installed, so command validation was performed against the official Kubernetes documentation. The post is high-level and technically correct. Future improvements could include mentioning that following logs by label selector is subject to kubectl's concurrent log request behavior and can be tuned with --max-log-requests.
