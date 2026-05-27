# Validation Summary: How to Implement Default Deny Network Policies in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes networking and DNS
- kubectl
- Kustomize
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- Added a prerequisite note that NetworkPolicy resources require a network plugin/CNI that supports NetworkPolicy enforcement. Kubernetes accepts the objects even if the network plugin does not enforce them.
- Removed hard-coded `metadata.namespace: production` from reusable NetworkPolicy examples and updated the apply command to use `-n production`, so the same manifests work in the later test namespace and Kustomize examples.
- Replaced the overly broad DNS egress rule using `namespaceSelector: {}` with a rule targeting `kube-system` and pods labeled `k8s-app: kube-dns`, matching the documented `kube-dns` service/CoreDNS deployment pattern more closely.
- Added the missing frontend egress policy to the three-tier example. With default deny egress enabled, allowing only API ingress is not enough; the source pod egress must also allow the connection.
- Corrected the Kustomize section from applying to "every namespace automatically" to applying to a target namespace, and added `namespace: production` to the `kustomization.yaml` example.
- Changed the deny-all comment from "everything is blocked" to pod ingress and egress being blocked, because Kubernetes documents exceptions such as traffic to and from the node where a pod is running.
- Changed the verification comment after `kubectl get networkpolicy` to say it verifies that the policy exists, not that traffic behavior has been tested.

## Review Notes
- The DNS policy assumes the cluster DNS pods carry the common `k8s-app: kube-dns` label. Some managed clusters may use different labels, so readers should verify their DNS pod labels before applying the rule.
- The ingress-controller rule assumes the ingress controller runs in an `ingress-nginx` namespace and forwards traffic to frontend pods on ports 80 and 443. Those values should be adjusted for different ingress controller deployments.
