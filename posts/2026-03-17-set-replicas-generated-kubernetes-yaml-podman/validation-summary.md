# Validation Summary: How to Set Replicas in Generated Kubernetes YAML with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Kubernetes
- Kubernetes YAML
- kubectl
- Container deployment scaling

## Sources Consulted
- Podman official documentation: podman-kube-generate, https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman official documentation: podman-generate, https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Kubernetes official documentation: kubectl autoscale, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale/
- Kubernetes official documentation: kubectl scale, https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The `kubectl get deployment`, `kubectl scale`, and `kubectl autoscale` examples used `api-server-deployment`, but Podman's documented Deployment output pattern for a generated Deployment from a container appends `-pod-deployment`. Updated these examples to use `api-server-pod-deployment`.
- The pod label selector example used `app=api-server`, but Podman's documented generated Deployment output uses the pod name in the `app` label for generated pod templates. Updated the selector to `app=api-server-pod`.
- The autoscaling command used `--cpu-percent=80`, but the current Kubernetes generated `kubectl autoscale` reference documents `--cpu=80%` for target CPU utilization. Updated the command accordingly.
- The `grep` output comment omitted the YAML indentation. Updated the expected output comment to match the generated YAML more closely.

## Review Notes
The current Podman documentation presents `podman kube generate` as the primary command form, while the `podman generate` reference still lists `kube` as a supported subcommand. The post's `podman generate kube` examples remain technically valid, but future updates could switch to the newer documented command ordering for consistency with current Podman examples.
