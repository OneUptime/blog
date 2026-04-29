# Validation Summary: How to Troubleshoot Kubewarden Policy Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- `kwctl`
- Kubernetes
- Admission webhooks
- `kubectl`
- `ClusterAdmissionPolicy`

## Sources Consulted
- Kubewarden Quick start: https://docs.kubewarden.io/quick-start
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden architecture: https://docs.kubewarden.io/explanations/architecture
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden common tasks: https://docs.kubewarden.io/howtos/tasks
- Kubewarden monitor mode: https://docs.kubewarden.io/reference/monitor-mode
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes admission webhook good practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/

## Issues Found
- `kubectl get clusteradmissionpolicy -A` was incorrect because `ClusterAdmissionPolicy` is cluster-scoped. I removed `-A`.
- The status guidance mentioned an `error` state and described `pending` too narrowly. I updated it to match the current Kubewarden status model and clarified that `pending` is a reconciliation state.
- The `kwctl run` examples used an OCI reference without the required `registry://` scheme. I corrected the policy URI format.
- The verbose example used `--verbose` as if it were a `kwctl run` flag. I changed it to the global `kwctl -v run ...` form.
- The settings-validation section used `kwctl run --validate-settings`, which is not part of the current `kwctl` CLI reference. I replaced it with a supported `kwctl run` example and adjusted the explanation accordingly.
- The events command sorted by `.lastTimestamp`. I updated it to `.metadata.creationTimestamp`, which matches current `kubectl` quick-reference examples.
- The webhook section assumed a single `ValidatingWebhookConfiguration` named after the PolicyServer. I corrected this to Kubewarden's per-policy webhook configuration model and updated the example resource name.
- I updated the debugging checklist to use the corrected webhook configuration example.

## Review Notes
- Examples still assume the default Kubewarden installation layout, including a PolicyServer deployment named `kubewarden-policy-server-default`.
- The webhook inspection example assumes a validating `ClusterAdmissionPolicy`; mutating policies use `MutatingWebhookConfiguration` instead.
- `kwctl` and `kubectl` were not installed in the review workspace, so CLI verification relied on current official documentation rather than local `--help` output.
