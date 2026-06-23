# Validation Summary: How to Migrate from kube-proxy NodePort to MetalLB LoadBalancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- kube-proxy
- NodePort
- LoadBalancer Services
- MetalLB
- MetalLB IPAddressPool and L2Advertisement CRDs
- Prometheus Operator ServiceMonitor
- Prometheus alerting rules
- kubectl
- jq
- Bash

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.16.1 native and native-prometheus manifests: https://github.com/metallb/metallb/tree/v0.16.1/config/manifests
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The prerequisites named Kubernetes 1.13 or later as sufficient for the migration. Replaced that with guidance to use a Kubernetes version supported by the installed MetalLB release, because support is release-specific.
- The prerequisites omitted MetalLB's strict ARP requirement for kube-proxy in IPVS mode. Added that requirement.
- The version check used `kubectl version --short`, which is not valid with current kubectl versions. Updated it to `kubectl version`.
- The install command used MetalLB v0.14.5. Updated the official manifest URL to v0.16.1, matching the current MetalLB documentation reviewed.
- MetalLB service annotations used the old `metallb.universe.tf/*` prefix. Updated examples to the current `metallb.io/loadBalancerIPs` and `metallb.io/allow-shared-ip` annotations.
- The migration diagram implied native percentage traffic splitting between Services. Reworded it to make clear that canary splitting must be done through DNS, ingress, or client-side routing.
- The Service rename example piped a live Service object through `sed`, which can carry generated or immutable fields and can fail while the temporary LoadBalancer service still owns its ClusterIP. Replaced it with guidance to apply a clean final Service manifest.
- The in-place migration section said NodePorts are automatically removed after conversion to LoadBalancer. Kubernetes allocates LoadBalancer NodePorts by default, and existing nodePort entries are not automatically deallocated when disabling allocation. Corrected the explanation.
- The batch migration script summary used `-l type=LoadBalancer`, but the script never creates that label. Changed it to list services and filter by the LoadBalancer type in the command output.
- The Prometheus ServiceMonitor example selected labels and a port that do not match the plain MetalLB manifest and omitted the Services required by ServiceMonitor discovery. Replaced it with metrics Services and ServiceMonitor resources aligned with MetalLB's current Prometheus manifest.
- The example `MetalLBSpeakerDown` alert used a `job` label that did not match the corrected ServiceMonitor configuration. Updated the expression to `up{job="speaker"} == 0`.
- The NodePort limitation "No automatic failover if a node goes down" was too broad. Clarified that the issue is lack of automatic client failover when clients are configured to use a single node IP.

## Review Notes
The post is technically relevant and now aligns with the current MetalLB and Kubernetes Service documentation reviewed. Future improvements could mention BGP mode setup separately, because the current walkthrough focuses on L2 mode while briefly referencing BGP.
