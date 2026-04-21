# Validation Summary: How to Configure VMware Tanzu Kubernetes with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VMware Tanzu Kubernetes Grid (TKG)
- VMware vSphere
- VMware NSX / Avi Load Balancer (NSX Advanced Load Balancer)
- Kubernetes IPv4/IPv6 dual-stack Services
- Antrea CNI and antctl
- Tanzu CLI and kubectl

## Sources Consulted
- Broadcom Tanzu Kubernetes Grid 2.5 IPv4/IPv6 Dual-Stack Networking: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/mgmt-reqs-network-dual-stack.html
- Broadcom Tanzu Kubernetes Grid 2.5 IPv6 Networking: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/mgmt-reqs-network-ipv6.html
- Broadcom Tanzu Kubernetes Grid 2.5 Configuration File Variable Reference: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/config-ref.html
- Broadcom Tanzu Kubernetes Grid 2.5 management cluster configuration for vSphere: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/mgmt-deploy-config-vsphere.html
- Broadcom Tanzu Kubernetes Grid 2.5 workload cluster configuration and deployment docs: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/workload-clusters-configure.html
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- Antrea antctl documentation: https://antrea.io/docs/v2.5.0/docs/antctl/

## Issues Found

1. **Invalid IPv6 CIDR examples**: Replaced `fd00:svc::/108` and `fd00:pod::/48` with valid TKG-style IPv6 service and pod CIDRs, `fd00:100:64::/108` and `fd00:100:96::/48`.

2. **Incorrect TKG dual-stack setting**: Replaced the non-existent `ENABLE_IPV6: true` variable with `TKG_IP_FAMILY: ipv4,ipv6`, which is the documented TKG setting for IPv4-primary dual-stack clusters.

3. **Incorrect vSphere network variable**: Changed `NETWORK` to `VSPHERE_NETWORK` and added `INFRASTRUCTURE_PROVIDER: vsphere`, matching the documented TKG configuration variables.

4. **Management cluster CNI setting was misleading**: Removed `CNI: antrea` from the management cluster example because TKG documentation says not to override the management cluster CNI; Antrea is the default.

5. **Workload cluster object spec was incomplete and used questionable dual-stack placement**: Replaced the partial Cluster API object with the documented flat TKG workload cluster configuration style using `TKG_IP_FAMILY`, dual-stack CIDRs, and `CNI: antrea`.

6. **Outdated product naming and requirement wording**: Replaced "NSX-T Advanced Load Balancer" with Avi Load Balancer / NSX Advanced Load Balancer and updated the support note to TKG 2.5.x full dual-stack support.

7. **Incorrect Antrea dual-stack guidance**: Removed the implication that `AntreaIPAM: true` is required for dual-stack. Dual-stack is selected through TKG cluster network settings at creation time.

8. **antctl command container targeting**: Added `-c antrea-agent` to `kubectl exec` commands that run `antctl`, matching Antrea documentation for running antctl inside the Antrea agent container.

9. **LoadBalancer dual-stack caveat**: Clarified that Avi Load Balancer service type `LoadBalancer` in TKG 2.5 uses a single frontend VIP, even when the Kubernetes Service has dual-stack ClusterIPs.

10. **Invalid IPv6 verification placeholders**: Replaced invalid `fd00:pod::...` and `fd00:svc::...` example addresses with valid example addresses from the corrected pod and service CIDRs, and changed the DNS AAAA check to use the dual-stack sample Service.

## Review Notes
- The Kubernetes `Service` examples use valid `ipFamilyPolicy` and `ipFamilies` fields for dual-stack Services.
- The Tanzu CLI commands use the current documented `tanzu mc create` / `tanzu mc get` form; `management-cluster` remains an older long-form command group in many examples.
- The configuration snippets still require environment-specific vSphere values such as vCenter, datastore, folder, resource pool, and credentials before they can be applied.
