# Validation Summary: How to Use Whereabouts IPAM for Static IP Assignment in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- CNI IPAM
- Whereabouts IPAM
- Multus CNI
- NetworkAttachmentDefinition
- macvlan and bridge CNI plugins
- StatefulSets
- kubectl

## Sources Consulted
- Whereabouts upstream README: https://github.com/k8snetworkplumbingwg/whereabouts
- Whereabouts daemonset manifest: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/daemonset-install.yaml
- Whereabouts reconciler manifest: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/reconciler-deployment.yaml
- Whereabouts IPPool type definition: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/pkg/api/whereabouts.cni.cncf.io/v1alpha1/ippool_types.go
- Whereabouts Kubernetes storage implementation: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/pkg/storage/kubernetes/ipam.go
- Whereabouts allocation implementation: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/pkg/allocate/allocate.go
- Whereabouts configuration implementation: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/pkg/config/config.go
- Multus network selection and IP request handling: https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/pkg/multus/multus.go
- NetworkAttachmentDefinition client types: https://raw.githubusercontent.com/k8snetworkplumbingwg/network-attachment-definition-client/master/pkg/apis/k8s.cni.cncf.io/v1/types.go
- OKD IPPool API reference: https://docs.okd.io/latest/rest_api/network_apis/ippool-whereabouts-cni-cncf-io-v1alpha1.html
- CNI argument conventions: https://www.cni.dev/docs/conventions/

## Issues Found
- The post described Whereabouts as assigning static IPs from a pool by default. Updated the description and introduction to clarify that Whereabouts dynamically allocates from defined pools and supports predictable ranges or explicitly constrained addresses.
- The post said Whereabouts works with any CNI plugin and listed Multus as a peer plugin. Updated this to clarify that Whereabouts is an IPAM plugin used by CNI plugins that delegate IPAM, often through Multus.
- The install command used the stale `doc/daemonset-install.yaml` path and omitted the current reconciler manifest. Updated the path to `doc/crds/daemonset-install.yaml` and added `doc/crds/reconciler-deployment.yaml`.
- The specific IP example used the Multus `ips` annotation and claimed the pod would receive exactly that address. Current Whereabouts handles CNI `IP` arguments as additional static addresses while still performing pool allocation, so the example was replaced with a dedicated one-address Whereabouts range.
- The exclusion example used `192.168.60.10-192.168.60.20`, but Whereabouts excludes CIDRs or individual IP addresses, not hyphenated ranges. Replaced it with equivalent CIDR exclusions.
- The IPPool viewing commands and example output did not match current Whereabouts CRD naming or allocation shape. Updated commands to use the normalized pool name and changed allocation examples to offset keys with `id`, `podref`, and `ifname`.
- The cleanup section claimed existing pods would recreate a deleted IPPool. Updated this to state that new pod network attachments recreate the pool.
- The firewall section used documentation-range addresses as if they were deployable public addresses and claimed only those pods could access the resource. Updated the text to require a real routed range and source-address preservation.
- The performance section included unsupported latency and scale numbers. Replaced them with qualitative guidance tied to API server/datastore latency, pool size, and pod churn.
- The StatefulSet section implied stable per-pod IP assignment across restarts. Updated it to describe stable IP ranges, matching Whereabouts' documented pool allocation behavior.
- The limitations section recommended manual pod annotation for persistent static IPs. Updated it to recommend a dedicated one-address Whereabouts range or static IPAM configuration for manual assignment.

## Review Notes
The examples assume Multus and the NetworkAttachmentDefinition CRD are already installed. The upstream Whereabouts manifests use the `latest` image tag, so production installations should pin a tested release.
