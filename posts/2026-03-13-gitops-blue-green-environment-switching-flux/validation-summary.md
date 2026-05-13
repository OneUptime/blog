# Validation Summary: How to Implement GitOps Blue-Green Environment Switching with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Deployments
- Kubernetes Services and selectors
- Kubernetes EndpointSlices
- kubectl
- Git
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI reconcile kustomization reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Flux Kustomization example referenced health checks in the `production` namespace but did not set a namespace for the rendered resources. Added `targetNamespace: production` and noted that the namespace must already exist or be included in the Kustomization path.
- The post said Flux reconciles selector changes "within seconds" and rollback is "typically under 30 seconds." Flux timing depends on source and Kustomization reconciliation, webhooks, and manual reconciliation, so the timing claims were revised.
- The Service selector switch explanation stated that all existing connections to blue complete normally. Kubernetes Services update EndpointSlices/proxy rules for matching Pods, but long-lived connection behavior depends on kube-proxy mode, protocol, and external load balancer behavior. The explanation was narrowed accordingly.
- The post said the blue and green Deployments differed only in image tag and version labels, but the examples also differ by Deployment name and slot label. Updated the wording.
- The cleanup command updated the inactive blue slot image but left the `version` label at `2.4.0`. Added a second command to update the version label to `2.5.0`.

## Review Notes
The Kubernetes and Flux API versions used in the YAML snippets are current. The `kubectl exec`, `kubectl port-forward`, Git, and selector commands are syntactically valid for the documented workflow. The local environment did not have `kubectl` or `flux` installed, so CLI verification used official command references rather than local `--help` output.
