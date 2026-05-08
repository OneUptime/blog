# Validation Summary: How to Validate Resolution of Calico Node Not Ready Status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- BGP networking

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes assigning Pods to nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The post described the `kubectl run --overrides` examples with `spec.nodeName` as pod scheduling tests. Kubernetes documents that setting `spec.nodeName` bypasses the scheduler and causes the kubelet on the named node to attempt to place the Pod. Updated the description, introduction, symptom, validation step heading, and conclusion to describe these as pod startup/readiness validation instead of scheduler validation.

## Review Notes
- The `kubectl` and `calicoctl` commands are consistent with current official documentation. The local environment did not have `kubectl` or `calicoctl` installed, so command verification was performed against official references rather than local `--help` output.
