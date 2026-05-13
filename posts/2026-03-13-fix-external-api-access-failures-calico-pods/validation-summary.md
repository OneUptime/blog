# Validation Summary: How to Fix External API Access Failures from Calico Pods

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Calico IPPool outgoing NAT
- calicoctl
- Kubernetes kubectl
- Kubernetes Deployments
- DNS and HTTPS egress

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes guide for updating API objects with kubectl patch: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The `calicoctl get ippool ... -o jsonpath=...` example used a Kubernetes-style `jsonpath` output mode that the official `calicoctl get` reference does not list. Changed it to `calicoctl get ippool ... -o yaml` with an instruction to inspect `spec.natOutgoing`.
- The immediate `kubectl run` test pod was launched in the default namespace even though the sample policy is scoped to the `production` namespace. Added `-n production` so the test validates the policy shown in the post.
- The NAT source-IP verification said the result should always be the node IP. Calico performs node-local SNAT, but external services may see a node egress address or an upstream NAT address. Updated the wording to avoid a false expectation while preserving the core check that the source should not be the pod IP.
- The specific API egress policy allowed only UDP DNS. Added TCP port 53 as well, matching the broader DNS rule earlier in the post and covering DNS responses or retries that use TCP.
- The proxy configuration was shown as a partial Deployment applied with `kubectl apply`, which is not a valid full `apps/v1` Deployment manifest because required fields such as `spec.selector`, pod template labels, and container images are omitted. Changed the example to a strategic merge patch file and updated the command to `kubectl patch deployment ... --patch-file`.
- The introduction claimed each fix was safe to apply independently without disrupting other traffic. Because egress policies and IP pool NAT can change traffic behavior for selected pods or entire pools, revised the sentence to recommend reviewing policy selectors and IP pool scope before production changes.
- The best-practice note said HTTPS calls fail silently when DNS is blocked. Updated it to say HTTPS calls fail before connecting, which is more technically accurate.

## Review Notes
The Calico `projectcalico.org/v3` NetworkPolicy examples, selectors, rule fields, `order`, `action`, `destination.nets`, and `destination.ports` are consistent with the current Calico Open Source resource reference. The `calicoctl patch ippool ... --patch` command is consistent with the official `calicoctl patch` examples. The examples remain generic and should be adapted to the cluster's actual namespace, pod labels, DNS service policy, IP pool name, proxy address, and external API IP ranges.
