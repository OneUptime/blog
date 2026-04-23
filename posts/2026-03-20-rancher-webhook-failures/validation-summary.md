# Validation Summary: How to Troubleshoot Rancher Webhook Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Admission webhooks
- kubectl
- OpenSSL
- jq

## Sources Consulted
- Rancher Webhook: https://ranchermanager.docs.rancher.com/v2.9/reference-guides/rancher-webhook
- Rotation of Expired Webhook Certificates: https://ranchermanager.docs.rancher.com/troubleshooting/other-troubleshooting-tips/expired-webhook-certificate-rotation
- Rancher webhook source repository: https://github.com/rancher/webhook
- Rancher charts repository: https://github.com/rancher/charts
- Kubernetes Dynamic Admission Control: https://v1-34.docs.kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The post described a separate `cattle-webhook` component. Rancher's current docs and chart sources show a `rancher-webhook` deployment and service that manages the `rancher.cattle.io` validating and mutating webhook configurations. I corrected the explanation and removed the nonexistent `app=cattle-webhook` pod check.
- The timeout section recommended patching `ValidatingWebhookConfiguration` directly. Rancher documents that it manages the `rancher.cattle.io` webhook configurations and overrides manual edits, so I changed this section to inspection guidance instead of presenting a direct patch as a supported fix.
- The emergency bypass section suggested changing `failurePolicy` or deleting the webhook configuration. Rancher documents a supported bypass that impersonates `system:serviceaccount:cattle-system:rancher-webhook-sudo` together with the `system:masters` group, so I replaced the bypass instructions with that supported method.
- The TLS test command used `kubectl run ... -- curl ...` without `--command`, which can invoke the image entrypoint instead of `curl`. I corrected the command to `--command -- curl ...`.
- The resource exhaustion section suggested patching deployment memory limits directly. Rancher manages the webhook deployment via Helm and may override direct changes, so I changed this to usage and restart-state inspection instead of an unsupported configuration change.
- The verification section grepped for `allowed|denied` log text. In Rancher webhook source, those log messages are emitted at debug level, so I changed the step to inspect recent logs for errors instead of relying on that grep.
- The service endpoint explanation said empty endpoints only mean a selector mismatch. I corrected this to include missing or not-ready pods as additional causes.
- The `kubectl top` example assumed Metrics Server availability. I added that prerequisite.
- The introduction and conclusion slightly overstated that webhook failures always reject API calls. Since webhook `failurePolicy` can vary, I adjusted the wording to say affected calls may be rejected and can block operations.

## Review Notes
- `kubectl top` requires Metrics Server to be installed and working.
- Rancher manages webhook versions and configuration compatibility by Rancher release. In rollback or version-skew scenarios, Rancher's version-specific webhook troubleshooting guidance is still relevant.
