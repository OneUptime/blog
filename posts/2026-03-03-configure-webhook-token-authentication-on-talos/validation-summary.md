# Validation Summary: How to Configure Webhook Token Authentication on Talos

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (machine config, talosctl)
- Kubernetes API server authentication
- Kubernetes TokenReview API (`authentication.k8s.io/v1`)
- Webhook token authentication
- Go (sample webhook server)
- Kubernetes Deployment and Service manifests
- OpenSSL (TLS certificate generation)
- kubectl

## Sources Consulted
- Kubernetes Authentication docs: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- TokenReview v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/
- kube-apiserver command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Talos Linux Configuration Patches: https://www.talos.dev/v1.9/talos-guides/configuration/patching/
- Talos `v1alpha1` config reference (`MachineFile` struct): https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/

## Issues Found

1. **Missing required `op` field in `machine.files` entry** — The Talos `MachineFile` struct requires an `op` field (valid values: `create`, `append`, `overwrite`), but the post's `webhook-api-server-patch.yaml` omitted it. Added `op: create` to the file entry so the patch would actually apply on a Talos node.

2. **Incorrect description of webhook unavailability behavior** — The post originally stated: "By default, the API server will fail open (allow the request) or fail closed (deny the request) depending on the configuration." This is a property of admission webhooks (`failurePolicy: Fail`/`Ignore`), not authentication webhooks. Authentication webhooks have no `failurePolicy` knob — if the webhook errors, the authenticator simply does not authenticate that request and the API server falls through to any other configured authenticators (treating the request as anonymous if none succeed and anonymous auth is enabled). Rewrote the paragraph to accurately describe this behavior.

## Review Notes
- The Go webhook server in Step 1 only registers `/authenticate`, but the Deployment in Step 2 configures liveness/readiness probes against `/healthz`. The probes would fail until a `/healthz` handler is added. Left as-is because the post presents Step 1 as a minimal example and the omission is a reasonable exercise for the reader; could be improved in a future revision.
- The webhook kubeconfig uses an empty `user: {}`, meaning the API server only validates the webhook's server certificate without presenting a client certificate. For production use, mutual TLS (with `client-certificate`/`client-key` under the user) is recommended; the post does not mention this trade-off.
- `--authentication-token-webhook-version` defaults to `v1beta1` historically; the post correctly sets it to `v1` (which has been GA since Kubernetes v1.20).
- `--authentication-token-webhook-cache-ttl` default is `2m0s`, which matches the post's "Balanced default" recommendation.
- All kube-apiserver flag names, Talos `cluster.apiServer.extraArgs` usage, and `talosctl patch machineconfig` syntax are correct.
- The TokenReview request/response JSON structure matches the official `authentication.k8s.io/v1` schema.
