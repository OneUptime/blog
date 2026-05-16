# Validation Summary: How to Rotate Kubernetes API CA Certificates in Talos

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration)
- Kubernetes (kubectl, API server, kubelets, service accounts)
- OpenSSL (CA generation, X.509 inspection)
- etcd (snapshot, member listing)
- Bash scripting / yq / jq

## Sources Consulted
- Talos Linux CA Rotation documentation: https://docs.siderolabs.com/talos/v1.10/security/ca-rotation
- Talos Linux Certificate Management: https://docs.siderolabs.com/talos/v1.11/security/cert-management
- Kubernetes manual CA rotation guide: https://kubernetes.io/docs/tasks/tls/manual-rotation-of-ca-certificates/
- `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes 1.24 service account token change: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/ and KEP for LegacyServiceAccountTokenNoAutoGeneration feature gate

## Issues Found

1. **Invalid `kubectl wait` condition** (Step 5): The post used `kubectl wait --for=condition=completed pod/rotation-test`. There is no standard pod condition named `completed`; for a Pod that runs to completion, the canonical way to wait is on the pod phase. Changed to `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/rotation-test --timeout=60s`.

2. **Invalid `kubectl rollout restart` flag** (Step 8): The post used `kubectl rollout restart deployment --all-namespaces`. `kubectl rollout restart` does not support `--all-namespaces` / `-A` (confirmed against the official kubectl reference and kubernetes/kubectl issue #1751). Replaced with a `for` loop over namespaces using `kubectl get ns -o jsonpath='{.items[*].metadata.name}'`.

3. **Outdated service-account token behavior** (Step 8): The post claimed "Kubernetes will automatically regenerate them" after the token secrets are deleted. Since Kubernetes 1.24 the `LegacyServiceAccountTokenNoAutoGeneration` feature gate is on by default and these long-lived token secrets are no longer auto-created. Rewrote the comment to clarify modern behavior (projected tokens served by the TokenRequest API at `/var/run/secrets/kubernetes.io/serviceaccount/token` are automatically re-issued under the new CA) so readers are not left expecting Kubernetes to recreate the deleted secrets.

## Review Notes

- **Manual rotation strategy vs. Talos's built-in tooling**: The post walks through a manual bundle-then-cutover procedure that uses `cluster.ca.crt` and `cluster.ca.key`. Talos actually ships a first-class command for this — `talosctl rotate-ca --talos=false --kubernetes=true` — and the manual machine-config path Talos documents uses a dedicated `cluster.acceptedCAs` field to hold the trust bundle alongside `cluster.ca`, rather than concatenating both certs into `cluster.ca.crt`. The post's approach can still convey the conceptual model of a bundle/cutover rotation, but readers running this in production should prefer `talosctl rotate-ca` or follow the `.cluster.acceptedCAs` pattern from the official Talos CA Rotation guide. Per task scope (fix errors, do not restructure), this was left unchanged but is the most important caveat for future revisions.
- `kubectl get cs` (componentstatuses) is deprecated since Kubernetes 1.19. It still works on most clusters but emits a deprecation warning; future revisions could replace it with direct checks against the `/livez` and `/readyz` endpoints or `kubectl get --raw='/readyz?verbose'`.
- `kubectl auth can-i ... --as=system:serviceaccount:default:default` returns `yes`/`no` based on RBAC for the default ServiceAccount; on a locked-down cluster the expected answer is `no`, which is success — readers should not interpret a `no` answer here as a rotation failure.
- The `openssl s_client` validation at the end pipes through `openssl x509`, which will only show the leaf certificate (the API server cert), not the CA chain. To see the chain, `-showcerts` plus a small parser is needed. Acceptable for a smoke test.
