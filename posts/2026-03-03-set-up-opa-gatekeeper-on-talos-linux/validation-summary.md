# Validation Summary: How to Set Up OPA Gatekeeper on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- OPA Gatekeeper
- Kubernetes admission control
- Kubernetes custom resources
- Helm
- kubectl
- Rego policy language

## Sources Consulted
- OPA Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- OPA Gatekeeper constraint violation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- OPA Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- OPA Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- OPA Gatekeeper Helm chart values and templates: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/

## Issues Found
- The Helm install command used top-level `resources.*` settings and `audit.replicas=1`. The current official Gatekeeper chart defines controller manager resources under `controllerManager.resources`, audit resources under `audit.resources`, and the audit deployment is fixed at one replica in the chart template. Updated the command to use the correct chart value paths and removed the ineffective `audit.replicas` setting.
- The monitoring command used `kubectl get --raw /metrics -n gatekeeper-system`, which reads the Kubernetes API server metrics path rather than Gatekeeper's Prometheus endpoint. Updated it to port-forward the Gatekeeper controller manager deployment on port 8888 and query `http://127.0.0.1:8888/metrics`.
- The metric names `gatekeeper_constraint_template_status` and `gatekeeper_request_duration_seconds` did not match current Gatekeeper documentation. Updated them to `gatekeeper_constraint_templates` and `gatekeeper_validation_request_duration_seconds`, and clarified that `gatekeeper_violations` reports audited violations.

## Review Notes
The policy examples use Gatekeeper's default Rego v0-style ConstraintTemplate syntax, which is still valid. For future hardening, the pod-focused policies could mention workload resource expansion if the goal is to validate Deployment, StatefulSet, or DaemonSet manifests before their pods are created.
