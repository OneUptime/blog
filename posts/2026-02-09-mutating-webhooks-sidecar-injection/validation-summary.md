# Validation Summary: How to Implement Mutating Webhooks for Automatic Sidecar Injection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Pods and sidecar containers
- Kubernetes mutating admission webhooks
- Kubernetes JSON Patch admission responses
- Kubernetes init containers
- Kubernetes MutatingWebhookConfiguration
- Go client libraries for Kubernetes
- kubectl

## Sources Consulted
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- RFC 6902 JSON Patch specification: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The sidecar injection example used numeric array indexes for appending containers. This can work when the index equals the current array length, but the JSON Patch append marker `-` is clearer and avoids stale index bookkeeping across multiple patches. Updated the container patch paths to `/spec/containers/-`.
- The volume patch examples added entries under `/spec/volumes/<index>` or `/spec/volumes/-` even when the Pod did not already have a `volumes` array. RFC 6902 requires parent paths to exist. Updated the snippets to add `/spec/volumes` as a full array when omitted, and append to `/spec/volumes/-` only when the array already exists.
- The logging sidecar mounted a `config` volume, but the webhook only injected the `varlog` volume. Updated `createVolumePatches` to inject both required volumes and added a note that the `fluent-bit-config` ConfigMap must exist.
- The init container example added `/spec/initContainers/<index>` even when `initContainers` was omitted. Updated it to add `/spec/initContainers` as an array when absent, and append to `/spec/initContainers/-` when present.
- The shared volume mount example appended to `/spec/containers/<i>/volumeMounts/-` even when a container had no `volumeMounts` array. Updated it to add the full `volumeMounts` array when absent.
- The init container example used `int64Ptr` without defining it in the post. Added the helper function.

## Review Notes
- The webhook configuration uses `failurePolicy: Ignore`, which is technically valid and matches the post's stated availability goal, but production systems should choose this deliberately because failed injection can allow pods to run without expected sidecars.
- The post injects sidecars as regular app containers. This remains valid, especially for compatibility with older Kubernetes versions or when startup ordering is not required. Kubernetes also supports native sidecar containers as restartable init containers in newer versions.
- `kubectl` was not installed in the review workspace, so CLI command validation was done against Kubernetes documentation rather than local `kubectl --help` output.
