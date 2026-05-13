# Validation Summary: How to Configure Calico on Minikube for a New Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Minikube
- Kubernetes
- calicoctl
- Calico IPPool resources
- Calico FelixConfiguration resources

## Sources Consulted
- Calico calicoctl install and datastore configuration: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post stated that the default IP pool always uses `192.168.0.0/16`. Calico actually chooses the first locally unused private `/16` from its documented list, often `192.168.0.0/16` on Minikube. Updated the wording to reflect the documented default behavior.
- The IP pool replacement step did not warn that existing pods already allocated from the old pool need to be recreated. Added a short caveat so the command sequence is accurate beyond a completely empty cluster.
- The IPv6 step used `CALICO_IPV6POOL_CIDR=""`, which is a startup default-pool environment variable and does not reliably disable IPv6 support after Calico is running. Replaced it with a FelixConfiguration patch setting `ipv6Support: false`.
- The encapsulation patch targeted `default-ipv4-ippool` even after the optional CIDR step created `custom-ipv4-ippool`. Updated the command to patch the custom pool and added a note to use the default pool name if Step 3 was skipped.

## Review Notes
The post pins `calicoctl` to v3.27.0. The resource fields and calicoctl commands reviewed are still valid in current Calico documentation, but users should normally match the `calicoctl` version to the installed Calico version.
