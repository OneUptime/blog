# Validation Summary: How to Use kubectl run with --rm for Temporary Debug Pods

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Temporary debug pods
- Container images for troubleshooting

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl command-line tool overview: https://kubernetes.io/docs/concepts/overview/kubectl/
- nicolaka/netshoot GitHub repository: https://github.com/nicolaka/netshoot

## Issues Found
- The post stated that `kubectl run --rm` creates pods that automatically delete when you exit. The Kubernetes reference specifies that `--rm` deletes the pod after it exits and is only valid when attaching to the container, such as with `--attach` or `-i/--stdin`. Updated the wording to include that attachment requirement.
- The post described `--restart=Never` as "job-like behavior." `kubectl run` creates a Pod, and `--restart` sets the Pod restart policy rather than creating a Kubernetes Job. Updated the wording to "single-run pod behavior" and clarified that `--restart=OnFailure` provides container retry logic.

## Review Notes
The referenced flags `--rm`, `-i`, `-t`, `--image`, `--overrides`, and `--restart` are current in the Kubernetes kubectl run reference. `nicolaka/netshoot` is a real troubleshooting image maintained in the linked GitHub repository. Local `kubectl` was not installed in the review environment, so validation used the official Kubernetes reference documentation.
