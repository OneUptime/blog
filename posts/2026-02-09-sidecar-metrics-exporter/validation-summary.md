# Validation Summary: How to Configure Sidecar Containers for Metrics Exporter Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, Services, ServiceAccounts, NetworkPolicies, LimitRanges, HorizontalPodAutoscalers, PodDisruptionBudgets, and security contexts
- Prometheus Operator ServiceMonitor
- Prometheus metrics exporter sidecar pattern
- Go net/http
- Python Flask
- kubectl
- GitLab CI/CD
- GitHub Actions
- Velero backup schedules

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Velero Schedule API documentation: https://velero.io/docs/v1.14/api-types/schedule/
- Azure k8s-set-context GitHub Action: https://github.com/Azure/k8s-set-context
- actions/checkout GitHub Action: https://github.com/actions/checkout
- GitLab CI/CD job rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- Go net/http package documentation: https://pkg.go.dev/net/http
- Flask quickstart documentation: https://flask.palletsprojects.com/en/stable/quickstart/

## Issues Found
- The Deployment examples claimed to show a sidecar metrics exporter pattern but only defined the application container. Added `metrics-exporter` sidecar containers exposing a named `metrics` port on `9090`.
- The advanced Deployment referenced `serviceAccountName: app-service-account` without defining that ServiceAccount. Added a ServiceAccount resource to the same manifest block.
- The ServiceMonitor example selected a Service labeled `app: myapp`, while the Deployment used `app: advanced`, and no pod exposed port `9090`. Updated the Service and ServiceMonitor labels to match the Deployment and the added exporter port.
- Several examples used `myapp:latest` despite later recommending specific image tags. Replaced those with explicit example tags.
- The GitLab CI example used the deprecated `only` keyword. Replaced it with `rules` using `$CI_COMMIT_BRANCH == "main"`.
- The GitHub Actions example used older action major versions. Updated `actions/checkout` and `azure/k8s-set-context` to current major versions.
- The testing commands referenced a `myapp` Service and Deployment that the examples did not create. Updated the commands to expose and test `advanced-app`, and pinned the BusyBox image tag.
- Later Kubernetes examples used inconsistent `myapp` names and selectors. Aligned the Service, HPA, NetworkPolicy, Velero Schedule label selector, and PodDisruptionBudget with the `advanced-app` / `app: advanced` example.

## Review Notes
YAML snippets were parsed successfully with PyYAML, and the Python snippet parsed successfully with Python `ast`. Local `kubectl` and `go` binaries were not available in the workspace, so Kubernetes server-side dry runs and Go compilation were not run. The Flask example uses Flask's development server style and remains suitable as a minimal example, not as a production WSGI serving recommendation.
