# Validation Summary: How to Prevent an Older Drone Build from Deploying After a Newer Commit

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone CI
- Kubernetes Deployments and the Kubernetes API
- `kubectl patch`
- JSON Patch (RFC 6902)
- Python 3 `subprocess`
- OCI container image digests
- CI/CD deployment ordering and optimistic concurrency

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Security Checklist: https://kubernetes.io/docs/concepts/security/security-checklist/
- RFC 6902, JSON Patch: https://www.rfc-editor.org/rfc/rfc6902.html
- Drone `DRONE_BUILD_NUMBER` reference: https://docs.drone.io/pipeline/environment/reference/drone-build-number/
- Python 3 `subprocess` documentation: https://docs.python.org/3/library/subprocess.html

## Issues Found
No technical issues found.

## Review Notes
The Python helper is syntactically valid and its concurrency argument is sound for the deliberately narrow scope stated in the post. Kubernetes documents JSON Patch test conditions for lost-update protection, and RFC 6902 requires the patch to fail without applying changes when a test fails. The `kubectl patch --type=json -p` invocation and positional container image path are current and documented. The post also correctly distinguishes updating Deployment desired state from rollout completion and explicitly identifies the container-index, digest-validation, writer-ownership, rollback-policy, and build-number-scope limitations. The example requires Python 3.7 or later because it uses `text` and `capture_output` in `subprocess` calls.
