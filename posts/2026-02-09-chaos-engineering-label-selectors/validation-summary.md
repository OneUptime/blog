# Validation Summary: How to Use Chaos Engineering Experiments That Target Specific K8s Label

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes labels and label selectors
- kubectl
- Chaos Mesh PodChaos
- Chaos Mesh NetworkChaos
- Chaos Mesh StressChaos
- Chaos Mesh Workflow
- Prometheus-style monitoring concepts

## Sources Consulted
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Chaos Mesh Define the Scope of Chaos Experiments documentation: https://chaos-mesh.org/docs/2.6.7/define-chaos-experiment-scope/
- Chaos Mesh Simulate Pod Faults documentation: https://chaos-mesh.org/docs/2.7.2/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh Simulate Network Faults documentation: https://chaos-mesh.org/docs/next/simulate-network-chaos-on-kubernetes/
- Chaos Mesh Create Chaos Mesh Workflow documentation: https://chaos-mesh.org/docs/2.7.3/create-chaos-mesh-workflow/
- Chaos Mesh Run a Chaos Experiment documentation: https://chaos-mesh.org/docs/2.6.7/run-a-chaos-experiment/

## Issues Found
- The backend Deployment declared `containerPort: 8080` while using the default `httpd:latest` image, which listens on port 80 by default. Changed the container port to 80.
- The complex selector example used `NetworkChaos` `target` as if it excluded critical pods. In Chaos Mesh, `target` is used with `direction` to scope packets for network faults, not to exclude source pods. Moved the `critical DoesNotExist` expression into the main selector and changed the example to a delay fault.
- The tenant isolation `NetworkChaos` target selector omitted `target.mode`. Added `mode: all`, matching the official Chaos Mesh partition example shape.
- The critical-workload example mixed a shell command and Kubernetes YAML in one `yaml` code fence. Split the label command into a `bash` block and kept the chaos manifest as YAML.
- The blue-green example used `kubectl patch` to update a Chaos Mesh experiment `spec`, but Chaos Mesh documentation says experiment specs are not allowed to be updated. Replaced it with deleting the blue experiment and applying a separate green-targeted manifest generated from the original file.
- The monitoring section used unverified Chaos Mesh Prometheus metric names. Replaced those with supported `kubectl describe` inspection commands for the Chaos Mesh experiment objects.
- The reusable profile heredoc inserted multi-line ConfigMap data without indenting all expanded lines, which would create malformed YAML. Updated the command to indent the profile data with `sed` before insertion.

## Review Notes
The YAML snippets parse successfully with PyYAML after the fixes. `kubectl` is not installed in this workspace, so server-side validation against installed Chaos Mesh CRDs could not be performed locally. The post assumes the `production` namespace already exists before applying namespaced manifests.
