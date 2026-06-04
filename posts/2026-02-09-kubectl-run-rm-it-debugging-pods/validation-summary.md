# Validation Summary: How to Use kubectl run --rm -it for One-Off Debugging Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Pods
- Kubernetes DNS and service discovery
- Kubernetes service accounts and RBAC
- Kubernetes Pod resource requests and limits
- Kubernetes container security context and privileged containers

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Debugging DNS Resolution guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/

## Issues Found
- The DNS troubleshooting example used the outdated `gcr.io/kubernetes-e2e-test-images/dnsutils:1.3` image. Updated it to the current Kubernetes documentation image, `registry.k8s.io/e2e-test-images/agnhost:2.39`, and removed the `dig` example because the official DNS debugging flow relies on `nslookup`.
- The service account example used `--serviceaccount`, which is not a current `kubectl run` flag. Replaced it with `--overrides='{"spec":{"serviceAccountName":"my-service-account"}}'`.
- The resource limits example used nonexistent `kubectl run` flags, `--requests` and `--limits`. Replaced them with a strategic override that sets the generated pod container's `resources.requests` and `resources.limits`.
- Several non-interactive examples used `--rm` without `--attach` or `-i`, but the kubectl reference states `--rm` is only valid when attaching to the container. Added `--attach --restart=Never` to those commands.
- Examples using `curlimages/curl` passed an explicit `curl` executable as arguments without `--command`, which can conflict with image entrypoint behavior. Added `--command --` where the post explicitly runs `curl`.
- The annotations section implied annotations appear in events and logs and create audit trails. Adjusted the wording to say they provide context in pod metadata.
- The "sidecar debug pod" wording was inaccurate because `kubectl run` creates a standalone pod, not a sidecar in an existing pod. Updated it to "standalone debug pod on the same node."

## Review Notes
The post is technically relevant and useful. Some examples still depend on cluster policy and image contents, such as privileged containers being allowed by admission controls, private registry credentials being available, and debug images including the expected shell or tools.
