# Validation Summary: How to Set Resource Quotas on Namespaces in Portainer - Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- YAML

## Sources Consulted
- Portainer documentation: Add a new namespace, https://docs.portainer.io/user/kubernetes/namespaces/add
- Portainer documentation: Manage a namespace, https://docs.portainer.io/user/kubernetes/namespaces/manage
- Kubernetes documentation: Resource Quotas, https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Limit Ranges, https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes kubectl reference: apply, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl reference: describe, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl reference: get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described ResourceQuota as limiting CPU and memory "consumed" by pods. Kubernetes compute quotas for CPU and memory are enforced on aggregate requests and/or limits, so the wording was changed to "requested or limited."
- The Portainer instructions used **Add namespace** for the create flow and **Resource assignment** or **Quota** / **Update quota** for editing an existing namespace. Current Portainer documentation uses **Add with form** for creation, labels the edit section **Resource Quota**, and saves changes with **Update namespace**, so those steps were corrected.
- The LimitRange section described "default per-pod limits" and said pods without resource requests bypass quota accounting. The example is a `type: Container` LimitRange that provides default requests and limits; Kubernetes may reject pods that omit required requests or limits when compute ResourceQuotas apply. The heading, lead-in, and YAML comment were corrected.

## Review Notes
The ResourceQuota and LimitRange manifests use current `apiVersion: v1` resources and valid quota keys. The kubectl commands are consistent with the official generated kubectl reference; `kubectl` was not installed locally, so command validation was performed against official documentation rather than local `--help` output.
