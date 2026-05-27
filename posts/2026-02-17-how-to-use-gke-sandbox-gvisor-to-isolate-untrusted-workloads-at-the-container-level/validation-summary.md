# Validation Summary: Use GKE Sandbox gVisor to Isolate Untrusted Workloads at the Container Level

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Sandbox
- gVisor
- Kubernetes RuntimeClass
- Kubernetes Deployments and Jobs
- Kubernetes NetworkPolicy
- kubectl and gcloud CLI

## Sources Consulted
- Google Cloud GKE Sandbox concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/sandbox-pods
- Google Cloud GKE Sandbox configuration guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/sandbox-pods
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- gVisor Kubernetes quick start: https://gvisor.dev/docs/user_guide/quick_start/kubernetes/
- gVisor security model: https://gvisor.dev/docs/architecture_guide/security/
- gVisor performance guide: https://gvisor.dev/docs/architecture_guide/performance/
- gVisor compatibility guide: https://gvisor.dev/docs/user_guide/compatibility/

## Issues Found
- The post said workloads needing direct hardware access such as GPUs should not use GKE Sandbox. Current GKE documentation supports selected GPU and TPU workloads with GKE Sandbox, so the wording was changed to unsupported direct hardware access or unsupported accelerator features.
- The node pool command used `COS_CONTAINERD`; Google Cloud documentation uses `cos_containerd`, so the example was updated to match the documented image type value.
- The default node pool warning was too broad. GKE documentation says Standard clusters must keep at least one non-sandboxed node pool, so the note was clarified.
- The deployment comment described scheduling through a node selector. GKE applies the required scheduling constraints for `runtimeClassName: gvisor`, so the comment was made provider-specific without implying a user-defined node selector.
- The verification section implied that `uname` and `/proc/version` from inside the sandbox were authoritative. Google Cloud documentation recommends checking `.spec.runtimeClassName` because data from inside the sandbox is not trustworthy for verification, so the inside-the-pod checks were marked as debugging only.
- The Job example lacked the `sandbox: "true"` pod label used by the later NetworkPolicy selector. The label was added to the Job pod template.
- The NetworkPolicy only allowed UDP DNS. TCP port 53 was added because DNS can use TCP as well as UDP.
- The monitoring example filtered `kubectl top pods` with `runtimeClassName=gvisor`, but `runtimeClassName` is not a pod label. The command was changed to use the application label.
- The event lookup used the Deployment name as the involved object. It now resolves a pod name and queries events for that pod.
- The performance section gave fixed percentage ranges that are not supported as general guarantees by official documentation. The bullets were changed to qualitative guidance aligned with gVisor's performance guide.
- The conclusion used overly absolute wording about preventing container escapes. It now says GKE Sandbox reduces direct exposure to host kernel vulnerabilities.

## Review Notes
The post is technically relevant and accurate after the fixes. Actual compatibility and performance still depend heavily on the workload, GKE version, node configuration, and accelerator type.
