# Validation Summary: How to Use CoreDNS Hosts Plugin to Inject Custom DNS Entries Cluster-Wide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS hosts plugin
- CoreDNS rewrite, forward, reload, log, and kubernetes plugins
- Kubernetes ConfigMaps and Deployments
- kubectl

## Sources Consulted
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes
- CoreDNS configuration manual: https://coredns.io/manual/configuration/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes ConfigMap and volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes ConfigMap update documentation: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/

## Issues Found
- The post incorrectly listed CNAME records as a hosts plugin feature. The official CoreDNS hosts documentation says the plugin supports A, AAAA, and PTR records, with PTR records generated automatically. Updated the feature list accordingly.
- The post implied hosts plugin priority depends on placing it earlier in the Corefile. CoreDNS documentation states Corefile order does not determine plugin execution order; plugin execution order is defined by the compiled plugin chain. Updated the wording to avoid that incorrect implication.
- The external hosts ConfigMap was mounted with `subPath`, while later sections claimed CoreDNS could reload updates automatically. Kubernetes documentation states ConfigMap mounts using `subPath` do not receive ConfigMap updates. Updated the example to mount the ConfigMap as a directory and adjusted CoreDNS hosts file paths consistently.
- The environment-specific section described "namespaced resolution" but the example used separate host files, not Kubernetes namespace-based DNS behavior. Updated the wording to match the example.

## Review Notes
The CoreDNS and Kubernetes snippets are broadly consistent with current official documentation. ConfigMap volume updates are still eventually propagated by kubelet, so the CoreDNS `hosts reload` interval is not the only delay to account for in production.
