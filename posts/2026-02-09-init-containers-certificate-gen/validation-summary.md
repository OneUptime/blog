# Validation Summary: How to Use Init Containers for Certificate Generation Before App Startup

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, init containers, volumes, ConfigMaps, Services, NetworkPolicies, HPAs, LimitRanges, and PodDisruptionBudgets
- TLS certificate generation with OpenSSL
- Go `net/http`
- Python Flask
- Prometheus Operator `ServiceMonitor`
- GitLab CI and GitHub Actions
- Velero schedules

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes volumes documentation, including `emptyDir`: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes API reference for HorizontalPodAutoscaler `autoscaling/v2`: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes API reference for PodDisruptionBudget `policy/v1`: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Prometheus Operator API reference for `ServiceMonitor`: https://prometheus-operator.dev/docs/api-reference/api/
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Flask documentation: https://flask.palletsprojects.com/en/stable/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Azure `k8s-set-context` action documentation: https://github.com/Azure/k8s-set-context
- Velero Schedule API documentation: https://velero.io/docs/v1.14/api-types/schedule/
- Docker Hub `alpine/openssl` tags: https://hub.docker.com/r/alpine/openssl/tags

## Issues Found
- The original Kubernetes examples did not include init containers or certificate generation, despite the title and description claiming that pattern. Added `initContainers` using OpenSSL, a shared `emptyDir` certificate volume, and read-only certificate mounts for the application containers.
- The original Go example started a plain HTTP server and did not consume generated certificate files. Updated it to read certificate paths from environment variables, use `ListenAndServeTLS`, and make readiness depend on the generated cert/key files.
- The original Python Flask example started plain HTTP and did not check generated certificate files. Updated it to read certificate paths from environment variables, verify them in readiness, and pass them through `ssl_context`.
- The advanced Kubernetes example advertised Prometheus scraping on port 9090 but exposed only port 8080. Added a named metrics port to match the annotation and the later monitoring example.
- The advanced Kubernetes example referenced `app-service-account` without defining it. Added a matching ServiceAccount resource so the manifest is internally complete.
- The GitHub Actions example used older action versions. Updated `actions/checkout` to `v6` and `azure/k8s-set-context` to `v4` based on current official examples.
- Several manifests used `myapp:latest` while the post advised using specific image tags. Updated those examples to `myapp:1.0.0`.

## Review Notes
The certificate examples use self-signed certificates for demonstrating the init-container pattern. For production, cert-manager, an internal PKI, Kubernetes Secrets, or a workload identity based certificate flow would usually be preferable to generating ad hoc self-signed certificates in every Pod.
