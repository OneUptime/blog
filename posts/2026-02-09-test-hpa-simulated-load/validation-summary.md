# Validation Summary: How to Test Kubernetes Horizontal Pod Autoscaler Behavior Under Simulated Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics Server
- Kubernetes Deployments, Services, probes, and resource requests
- kubectl
- Kind
- GitHub Actions
- Go
- Python

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Metrics Server documentation: https://kubernetes-sigs.github.io/metrics-server/
- Kind quick start and image-loading documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- actions/checkout official repository: https://github.com/actions/checkout
- actions/upload-artifact official repository: https://github.com/actions/upload-artifact
- Azure/setup-kubectl official repository: https://github.com/Azure/setup-kubectl
- Python 3.12 syntax validation using local `ast.parse`
- YAML syntax validation using local PyYAML

## Issues Found
- The Deployment used `hpa-test-app:latest` without an image pull policy. In Kind, a locally loaded `:latest` image is still subject to Kubernetes' default `Always` pull policy, so the pod can fail by trying to pull a non-existent remote image. Changed the image to `hpa-test-app:test` and added `imagePullPolicy: IfNotPresent`.
- The Python runner attempted to connect directly to Pod IPs from the test host. That is not reliably reachable from a CI runner outside the cluster network. Changed the runner to collect pod names and use `kubectl port-forward` to call each pod's `/load` endpoint through localhost.
- The result analyzer assumed every scale-up event had `pod_count_after`, but the sudden spike test records only `pod_count`. Changed the analyzer to handle both event shapes.
- The result analyzer treated a first scale event at elapsed time `0` as false and reported it as slow. Changed the assessment check to test for `None` explicitly.
- The scale-rate calculation assumed 60-second intervals for all scale-up tests, but the sudden spike test samples every 15 seconds and records `elapsed_seconds`. Changed the calculation to use recorded elapsed time when available.
- The GitHub Actions workflow used older action versions and omitted required setup for Kind and Python dependencies. Updated `actions/checkout`, `azure/setup-kubectl`, added Kind installation, added Docker image build/load steps, waited for Metrics Server rollout, and installed the Python `requests` dependency before running the test script.

## Review Notes
- The HPA API fields, scaling behavior fields, CPU resource metric configuration, and Metrics Server role in feeding the `metrics.k8s.io` API are consistent with current Kubernetes documentation.
- Local `kubectl` and `go` binaries were not available in this workspace, so Kubernetes command behavior and Go API usage were checked against official documentation rather than executed locally.
