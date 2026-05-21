# Validation Summary: How to Set Up Complete CI/CD Pipeline with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio traffic management
- Istio VirtualService and DestinationRule resources
- Istio standard Prometheus metrics
- Kubernetes Deployments and kubectl rollout commands
- GitHub Actions workflow jobs, job dependencies, and outputs
- Azure Kubernetes GitHub Actions
- Prometheus HTTP API

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Actions contexts reference: https://docs.github.com/en/actions/learn-github-actions/contexts
- Azure k8s-set-context action: https://github.com/Azure/k8s-set-context
- Azure setup-kubectl action: https://github.com/Azure/setup-kubectl

## Issues Found
- Updated `azure/k8s-set-context@v3` to `azure/k8s-set-context@v4` to use the current action version shown by the official Azure action examples.
- Added `azure/setup-kubectl@v4` to jobs that run `kubectl`, because each GitHub Actions job runs in its own runner environment and should install required command-line tools before use.
- Added `istioctl` installation before `istioctl analyze` in the staging job. The post already installed `istioctl` in the separate validation job, but that installation does not carry across jobs.
- Added Kubernetes context setup to the canary, progressive rollout, promote, and rollback jobs. The original workflow configured context only in the staging job, but GitHub Actions job state is not shared across jobs.
- Added a stable deployment template label patch before creating Istio subsets. DestinationRule subsets select workloads by labels, so the stable pods must have `version: stable` for traffic splitting to work.
- Changed Prometheus queries from `namespace="production"` to `destination_workload_namespace="production"`, which is the standard Istio metric label for destination workload namespace.
- Changed the Prometheus endpoint from `http://prometheus:9090` to a local `kubectl port-forward` against `svc/prometheus`, because a GitHub-hosted runner cannot resolve an in-cluster `prometheus` service name directly.
- Changed the `promote` job dependencies to include `build`, because GitHub Actions exposes `needs.<job_id>.outputs` only for direct dependencies and the job reads `needs.build.outputs.image_tag`.
- Changed the rollback condition from bare `failure()` to an explicit `always() && needs['progressive-rollout'].result == 'failure'` expression, so the rollback job can run after its dependency fails.

## Review Notes
The Istio `networking.istio.io/v1` VirtualService and DestinationRule examples, weighted routing fields, subset references, and header match syntax are current and match the official Istio API reference. The workflow still assumes a registry login, a reachable cluster, an existing `myapp` Service, a Prometheus service named `prometheus` in `istio-system`, and project-specific test scripts; those are environment prerequisites rather than errors in the tutorial snippets.
