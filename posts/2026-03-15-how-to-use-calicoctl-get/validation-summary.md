# Validation Summary: How to Use calicoctl get with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico network policy resources
- Calico IP pools
- BGP configuration
- jq

## Sources Consulted
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl` user reference and supported resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl installation and API group guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico API server / kubectl management guidance: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs guidance: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico end-user RBAC example for calicoctl: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac

## Issues Found
- The introduction described `calicoctl get` as the primary inspection tool and said `kubectl get` could only access Calico resources stored as Kubernetes CRDs. Current Calico documentation says the Calico API server and native v3 CRDs allow `kubectl` to manage Calico APIs, while `calicoctl` remains useful for Calico-specific and datastore-aware workflows. Updated the wording to reflect current behavior.
- The Go template example ranged directly over the top-level value and accessed `.ObjectMeta.Name`. Calico documents that `go-template` receives a slice of resource lists, and each resource list contains an `Items` field. Updated the example to range through `.Items`.
- The permission-denied troubleshooting note referred only to the `projectcalico.org` API group for Calico CRDs. Calico documentation distinguishes the exposed `projectcalico.org` API and backing `crd.projectcalico.org` resources depending on installation mode. Updated the note to cover both cases.

## Review Notes
The remaining `calicoctl get` resource names, namespace flags, output flags, and `jq` examples are consistent with the current Calico command reference and resource alias documentation. The post intentionally uses common example resource names such as `default-ipv4-ippool`; readers may need to adjust names to match their own cluster.
