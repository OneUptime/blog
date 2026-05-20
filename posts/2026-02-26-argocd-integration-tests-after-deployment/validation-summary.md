# Validation Summary: How to Run Integration Tests After ArgoCD Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD resource hooks
- Argo CD sync phases and sync waves
- Kubernetes Jobs
- Kubernetes init containers
- Kubernetes Job retry, timeout, and cleanup fields
- pytest
- Docker
- curl

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes automatic cleanup for finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- pytest usage documentation for JUnit XML output and built-in timeout-related behavior: https://docs.pytest.org/en/stable/how-to/output.html
- pytest-timeout plugin documentation: https://pypi.org/project/pytest-timeout/

## Issues Found
- The timeout example used `pytest --timeout=30` without noting that this option is provided by the external `pytest-timeout` plugin, not core pytest. I added a comment to the Kubernetes Job snippet clarifying that the test image must include `pytest-timeout`.

## Review Notes
The Argo CD hook annotations, hook delete policies, PostSync behavior, and sync wave ordering are consistent with the official Argo CD documentation. The Kubernetes Job examples use current `batch/v1` fields, including `backoffLimit`, `activeDeadlineSeconds`, and `ttlSecondsAfterFinished`. The examples are illustrative and assume the referenced Services, Secrets, endpoints, and custom test image exist in the target cluster.
