# Validation Summary: How to Fix Init Container Issues with Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Istio init containers
- Istio CNI node agent
- Kubernetes Pod Security Admission and Pod Security Standards
- Kubernetes init containers and debug containers
- iptables traffic redirection
- kubectl commands

## Sources Consulted
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Pod Security Admission documentation: https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio pilot-agent / istio-iptables command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post incorrectly stated that the Kubernetes `baseline` Pod Security Standard allows `NET_ADMIN` for init containers. Kubernetes Pod Security Standards and Istio's Pod Security Admission documentation both state that `baseline` does not allow `NET_ADMIN` or `NET_RAW`. Changed the guidance to use `privileged` when using the non-CNI `istio-init` model, and clarified that `baseline` or `restricted` workload namespaces should use Istio CNI.
- The init-container exit-code command read `.lastState.terminated.exitCode`, which only reports a previous terminated state after a restart. Changed it to `.state.terminated.exitCode` so it reports the completed init container's current terminated state.
- The iptables inspection commands used `kubectl exec` inside `istio-proxy`, which may fail because the proxy image may not include the needed tools and the container may not have the needed network administration capability. Changed these examples to use `kubectl debug` with a `netadmin` debug profile and a troubleshooting image.

## Review Notes
Istio CNI documentation notes that CNI mode may still inject an `istio-validation` init container for race-condition mitigation, so "new pods will not have the istio-init container" remains technically correct but does not mean there will be no Istio-related init container at all. The example Istio version tag `1.20.0` is old but used only as an image-pull-failure example, not as a recommendation.
