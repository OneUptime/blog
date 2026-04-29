# Validation Summary: How to Create Kubernetes Vertical Pod Autoscalers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- OpenTofu / Terraform-compatible HCL
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- Helm

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Autoscaler VPA README: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md
- Kubernetes Autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes Autoscaler VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes Autoscaler VPA sidecar container docs: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/sidecar-containers.md
- HashiCorp Kubernetes provider tutorial for `kubernetes_manifest` and CRDs: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Fairwinds VPA chart README: https://github.com/FairwindsOps/charts/blob/master/stable/vpa/README.md
- Fairwinds chart repository index: https://charts.fairwinds.com/stable/index.yaml

## Issues Found
- The post said Step 1 installed only VPA CRDs, but the Fairwinds Helm chart installs the full VPA stack. I changed the heading and install comments to describe the Helm release accurately.
- The original snippets implied `depends_on = [helm_release.vpa]` was enough for `kubernetes_manifest` resources that use the VPA CRD. According to the HashiCorp Kubernetes provider docs, the CRD must already exist at plan time, so I removed that implication and clarified that Step 1 must be applied first in a separate configuration or workspace before planning the VPA manifests.
- The install example pinned chart version `4.4.6`, which is outdated. I updated it to the current released Fairwinds VPA chart version `4.11.0`.
- The post omitted the Metrics Server prerequisite needed for VPA recommendations. I added that requirement to the overview.
- The Step 3 example used `updateMode = "Auto"`. Upstream VPA docs mark `Auto` as deprecated and equivalent to `Recreate`, so I updated the example and surrounding text to use `Recreate`.
- Step 4 claimed VPA manages init containers. Upstream VPA documentation states that VPA does not support `initContainers` yet, so I corrected the section to describe a wildcard container policy instead.
- The summary said VPA and HPA can work together without qualification. I corrected it to match upstream limitations: they should not manage the same resource metric, but VPA can be combined with HPA on separate resource metrics or with HPA on custom/external metrics.

## Review Notes
- The article is now technically correct for current upstream VPA and provider behavior as of 2026-04-29.
- The post does not cover `InPlaceOrRecreate`, which is available in newer VPA releases, but that omission is acceptable because the remaining examples are valid.
