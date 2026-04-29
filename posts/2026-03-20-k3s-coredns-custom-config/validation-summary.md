# Validation Summary: How to Configure K3s with CoreDNS Custom Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- CoreDNS
- DNS
- `kubectl`

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s packaged CoreDNS manifest: https://raw.githubusercontent.com/k3s-io/k3s/master/manifests/coredns.yaml
- CoreDNS `hosts` plugin: https://coredns.io/plugins/hosts/
- CoreDNS `forward` plugin: https://coredns.io/plugins/forward/
- CoreDNS `import` plugin: https://coredns.io/plugins/import
- CoreDNS `reload` plugin: https://coredns.io/plugins/reload/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/

## Issues Found
- The post said K3s manages CoreDNS through a HelmChart. I changed this to K3s’s current packaged AddOn model and documented the supported `coredns-custom` import mechanism, because current K3s deploys `coredns` as a packaged AddOn and rewrites packaged manifests on startup.
- The original hosts example added another `hosts` plugin to the default K3s server block and pointed it at `/etc/coredns/custom-hosts.txt` without a supported K3s mount path. I replaced it with a valid `coredns-custom` `*.server` example, because the `hosts` plugin can only be used once per server block and K3s already ships a `hosts /etc/coredns/NodeHosts` directive in the default Corefile.
- The forwarding example replaced the main `coredns` ConfigMap instead of using K3s’s supported customization path. I rewrote it to add `*.override` entries to `coredns-custom`, which is the officially documented K3s extension point for forwarding specific domains.
- The persistence section incorrectly instructed readers to patch the CoreDNS deployment to mount custom configuration. I removed that patch step and clarified that K3s already mounts the optional `coredns-custom` ConfigMap at `/etc/coredns/custom`.
- The import example placed `import /etc/coredns/custom/*.server` inside the default server block. I corrected it to match the shipped K3s Corefile, where `*.override` is imported inside the main block and `*.server` is imported outside it as additional server blocks.
- The HelmChartConfig section was not accurate for current K3s packaged CoreDNS. I replaced it with the correct manifests-directory AddOn example under `/var/lib/rancher/k3s/server/manifests`.
- The search-domain section implied CoreDNS configuration was the place to set search domains. I clarified that search domains are configured via Pod `dnsConfig` or kubelet settings, not in the CoreDNS Corefile.
- The step flow would have overwritten earlier `coredns-custom` keys by reapplying a replacement ConfigMap. I changed the forwarding step to edit the existing ConfigMap in place and updated the persistent example to include the forward override as part of the cumulative configuration.

## Review Notes
- The post now matches the current K3s packaged CoreDNS behavior as documented on April 29, 2026.
- Restarting the `coredns` Deployment after ConfigMap changes is still valid, although CoreDNS’s `reload` plugin can also detect changes in imported files on modern CoreDNS versions.
- In multi-server K3s clusters, files placed in `/var/lib/rancher/k3s/server/manifests` must be kept in sync manually across server nodes; K3s does not replicate user AddOn files between servers.
