# Validation Summary: How to Customize Migration from OVN to Calico on OpenShift for Real Clusters

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenShift 4.x
- OVN-Kubernetes
- Calico Open Source
- Kubernetes NetworkPolicy
- OVN EgressFirewall
- Calico IPPool, BGPPeer, GlobalNetworkPolicy, and FelixConfiguration resources
- BGP, VXLAN, and eBPF dataplane concepts

## Sources Consulted
- Calico Open Source documentation: Migrate from OVN-Kubernetes CNI to Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Red Hat OpenShift documentation for OVN-Kubernetes EgressFirewall behavior: https://docs.redhat.com/en/documentation/openshift_container_platform/

## Issues Found
- The IPPool example used `spec.encapsulation: VXLAN`, which is an operator Installation IP pool field, not a Calico `projectcalico.org/v3` IPPool field. Changed it to `vxlanMode: Always`, which is the correct IPPool field for VXLAN encapsulation.
- The GlobalNetworkPolicy example selected the namespace with `kubernetes.io/metadata.name`. Calico's resource reference documents `projectcalico.org/name` for `namespaceSelector`, so the selector was changed to `projectcalico.org/name == 'production'`.
- The FelixConfiguration example included `flowLogsFlushInterval` and `flowLogsFileEnabled`, which are not present in the Calico Open Source FelixConfiguration reference. Replaced them with `prometheusMetricsEnabled` and `prometheusMetricsPort`, which are valid Felix visibility settings.
- The FelixConfiguration snippet commented that it enabled eBPF while setting `bpfEnabled: false`. The post now states that Calico uses eBPF mode by default on OpenShift and leaves the example focused on logging and metrics.
- The verification command attempted to fetch `http://kubernetes.default.svc.cluster.local/healthz`, but the Kubernetes API service is not a plain HTTP endpoint. Replaced it with a service-backed pod connectivity test using an unprivileged nginx pod and a BusyBox client.

## Review Notes
The post is a customization-oriented guide rather than a full end-to-end migration procedure. Operators should still follow the official Calico OpenShift migration sequence for cluster migration steps and test policy translations in staging before applying them to production.
