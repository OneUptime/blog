# Validation Summary: Container Security Best Practices for Production Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker and Dockerfiles
- Distroless container images
- Hadolint
- Trivy and GitHub Actions
- GitHub code scanning SARIF upload
- Kubernetes Deployments, security contexts, NetworkPolicy, and Pod Security Standards
- External Secrets Operator
- Cosign image signing

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Distroless container images documentation: https://github.com/GoogleContainerTools/distroless
- Hadolint configuration documentation: https://github.com/hadolint/hadolint
- Trivy Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy security advisory GHSA-69fq-xp46-6x23: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The Dockerfile copied a Python 3.12 virtual environment from `python:3.12-slim` into `gcr.io/distroless/python3-debian12`, whose Python runtime is Debian-based and may not match the builder interpreter layout. Changed the builder to `debian:12-slim`, installed Debian Python packages, used `python3 -m venv`, and used `python3` in the final entrypoint so the builder and final distroless image are compatible.
- The Dockerfile comment said the distroless default is nonroot, but the nonroot behavior is provided by the `:nonroot` tag. Changed the final image to `gcr.io/distroless/python3-debian12:nonroot` and corrected the comment.
- The Trivy workflow used `aquasecurity/trivy-action@master`, which is not appropriate for a security best-practices guide and is inconsistent with current Trivy Action examples and the 2026 Trivy advisory guidance. Updated it to `aquasecurity/trivy-action@v0.36.0`.
- The Trivy workflow uploaded SARIF after a step configured with `exit-code: "1"`, but without `if: always()` the upload step would be skipped when vulnerabilities were found. Added `if: always()`.
- The GitHub SARIF upload example omitted the documented `security-events: write` permission. Added minimal `contents: read` and `security-events: write` permissions.
- Updated the SARIF upload action from `github/codeql-action/upload-sarif@v3` to the current documented major version, `@v4`.
- The Kubernetes image digest example used `sha256:abc123...`, which is not a syntactically valid digest. Replaced it with a 64-character hexadecimal placeholder digest.
- The NetworkPolicy namespace selectors used a non-standard `name` label or selected all namespaces for DNS. Updated them to use Kubernetes' well-known `kubernetes.io/metadata.name` namespace label for the ingress controller and `kube-system`.

## Review Notes
- The Kubernetes security context, Pod Security Standards labels, Hadolint configuration, and External Secrets Operator manifest are structurally consistent with the referenced documentation.
- The example image registry, digest, service account, namespaces, and labels are illustrative placeholders and still need to match a real cluster before direct use.
