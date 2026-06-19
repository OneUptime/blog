# Validation Summary: How to Handle Runbook Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3
- Kubernetes and kubectl
- Flask
- Mermaid diagrams
- Prometheus metrics
- Slack/chat-based approval workflow concepts
- Site Reliability Engineering runbook automation

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python unittest.mock documentation: https://docs.python.org/3/library/unittest.mock.html
- Python subprocess documentation: https://docs.python.org/3/library/subprocess.html
- Flask API documentation for request JSON handling and jsonify: https://flask.palletsprojects.com/en/stable/api/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Mermaid quadrant chart syntax documentation: https://mermaid.ai/open-source/syntax/quadrantChart.html
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The runbook example used `datetime.utcnow()`, which is deprecated in Python 3.12 and returns a naive datetime. Changed it to `datetime.now(timezone.utc).isoformat()` so timeline entries use a timezone-aware UTC timestamp.
- The pod-status parser only appended a pod summary inside the `containerStatuses` loop. Pods without `containerStatuses` produced no summary entry, causing the included healthy-pod unit test to fail. Changed the logic to append one summary entry per pod and mark it `OOMKilled` only when any container's last terminated state has that reason.
- The log collection step ignored non-zero `kubectl logs` exits and could continue with empty logs. Added failure logging and escalation when log collection fails.
- The Flask webhook used `request.json`, which can raise an unsupported media type error for non-JSON requests in current Flask versions. Changed it to `request.get_json(silent=True) or {}` and added validation for missing `labels.service`.
- The webhook mapping included `require_approval_after_hours` but the route never enforced it. Added a small after-hours gate so alerts configured for approval are not automatically executed outside the standard working window.

## Review Notes
- The Kubernetes commands and flags shown (`kubectl get pods -l ... -o json`, `kubectl logs -l ... --tail=100 --all-containers=true`, `kubectl rollout restart deployment/...`, and `kubectl rollout status deployment/... --timeout=30s`) match the Kubernetes kubectl reference.
- The Prometheus metrics snippet is conceptual YAML rather than a native Prometheus configuration file. The metric names and types are consistent with Prometheus concepts, but production instrumentation would normally be implemented in an application client library or exporter.
- The local environment did not have `kubectl` installed, so kubectl verification was done against the official Kubernetes reference documentation rather than local `kubectl --help` output.
