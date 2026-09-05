# Validation Summary: Istio Injects Its Own Control Plane and Breaks the Webhook: Recover from a Mislabelled `istio-system` Namespace

## Status
validated

## Post Type
Technical troubleshooting and recovery guide.

## Technologies Covered
- Istio, Istiod, revisioned sidecar injection, native sidecars, and ambient mode
- Kubernetes admission webhooks, Deployments, Services, EndpointSlices, and PodDisruptionBudgets
- kubectl, istioctl, jq, shell commands, YAML, Helm, and GitOps

## Sources Consulted
- [Istio sidecar injection policy](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio injection troubleshooting](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio multiple injection labels](https://istio.io/latest/docs/reference/config/analysis/ist0123/)
- [Istio ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Istio annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istiod chart Pod template](https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/templates/deployment.yaml)
- [Istio injector implementation](https://raw.githubusercontent.com/istio/istio/master/pkg/kube/inject/inject.go)
- [Istio CLI reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio ambient overview](https://istio.io/latest/docs/ambient/overview/)
- [Kubernetes dynamic admission and webhook audit annotations](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes disruptions and PDBs](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [jq manual](https://jqlang.org/manual/)
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl label](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [kubectl create](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/)
- [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl rollout/kubectl_rollout_restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [kubectl rollout/kubectl_rollout_status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)

## Issues Found
1. **Incident prerequisites:** The introduction implied that a namespace label alone injects stock Istiod. The upstream chart includes explicit Pod opt-outs. Qualified the scenario to require missing/overridden protection or a custom injector, and clarified that selectors alone do not override the standard injector's internal opt-out check.
2. **ReplicaSet claim:** Removed the unsupported assertion that mixed injection states are common; explained that they are possible when replacement Pods encounter changed namespace labels.
3. **Endpoint readiness and revisions:** Wide EndpointSlice output does not expose individual readiness conditions. Changed both checks to YAML and directed readers to the affected webhook's actual Service and Deployment before using generic names.
4. **Namespace guard impact:** Disabling injection also affects replacement gateways or other injection-dependent workloads. Moved the inventory prerequisite ahead of this change rather than limiting it to revision-label removal.
5. **Dry-run semantics:** Specified extracting a v1 Pod from the intended Deployment template and using a unique name with create --dry-run=server. Deployment dry run does not create or admit its Pods. Clarified that an unmodified result alone cannot prove no webhook call occurred, particularly with failed-open admission.
6. **Webhook identification:** Successful dry-run output does not supply a MutatingWebhookConfiguration name. Replaced that instruction with inventory/error-name mapping or API-server mutation audit annotations.
7. **Rollout behavior:** A restart replaces all Deployment replicas, not just one. Specified availability and surge settings, explained when a separately staged replica is necessary for manual verification, and avoided a redundant restart after template reconciliation.
8. **PodDisruptionBudgets:** PDBs do not block Deployment rolling updates or direct deletion. Replaced the incorrect rollout constraint with capacity/quota constraints and stated the PDB limitation.
9. **Native-sidecar inspection:** Included init-container statuses and Pod conditions in readiness output, made absent status arrays safe for jq, and required checking both container lists for missing proxies.
10. **Webhook CA repair:** A populated CA bundle alone does not establish correctness. Required matching the serving certificate's signing CA and restoring supported CA reconciliation instead of assuming installer application repairs dynamic certificates.
11. **Mesh membership:** Scoped missing-proxy remediation and monitoring to intended sidecar workloads; ambient workloads legitimately lack sidecars.

## Review Notes
- Verified the post's official documentation links and author profile destination. No broken post links required replacement.
- Confirmed label removal/overwrite syntax, namespace and Pod injection opt-outs, revision precedence, admission failure policies, dry-run behavior, standard serving ports, and diagnostic command options against official sources.
- This is a documentation and static-example review, not a live-cluster recovery test. No cluster mutations or outage reproduction were performed. Actual selectors, installation names, capacity, CA ownership, and runtime health require environment-specific verification.
- The post pins no release. Latest documentation and upstream chart/source were consulted; operators should compare their installed release's rendered manifests before recovery. Upstream master is mutable.
- The example recovery Pod manifest remains environment-specific and must be derived from the intended installer-rendered template. The watch command runs until interrupted.
