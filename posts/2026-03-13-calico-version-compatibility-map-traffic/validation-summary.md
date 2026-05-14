# Validation Summary: How to Map Calico Component Version Compatibility to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Calico CNI
- Felix
- BIRD
- confd
- calicoctl
- eBPF dataplane
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico eBPF installation requirements: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico eBPF troubleshooting: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes API deprecation guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post said Felix cannot program policy chains because the Kubernetes pod discovery API changed, and implied missing WorkloadEndpoints are directly Felix not seeing pods. Updated this to reflect Calico's documented model: WorkloadEndpoint lifecycle is normally handled by the Calico CNI/orchestrator integration, and Felix programs dataplane state from endpoint data.
- The post stated new pods with missing policy programming have all traffic allowed. This was too absolute. Updated the traffic impact to say enforcement may be missing or incorrect, or connectivity may fail, depending on the failure and dataplane state.
- The Kubernetes 1.25 beta API example was too vague and could be read as a pod API change. Updated it to the documented compatibility point: Calico releases are tested against specific Kubernetes versions, and removed APIs such as `policy/v1beta1` PodSecurityPolicy can break older manifests/controllers/clients.
- The `calicoctl` mismatch section claimed service policy changes could be silently applied with the wrong schema. Calico documentation recommends using a matching `calicoctl` version, but validation behavior depends on the mismatch and datastore path. Updated the section to describe validation/schema mismatch risk without asserting silent service-routing behavior.
- The eBPF section claimed Calico falls back to iptables mode automatically if eBPF programs fail. Calico eBPF mode is an explicit dataplane configuration, so the post now says affected connectivity can fail until kernel, Calico version, or dataplane configuration is corrected.

## Review Notes
- The diagnostic commands are plausible for operator-based Calico installs that use the `calico-system` namespace. Manifest-based installs may use `kube-system`, as noted in Calico troubleshooting documentation.
- BIRD diagnostics only apply to Calico deployments using BGP/BIRD. VXLAN-only, eBPF, or other dataplane configurations may require different checks.
