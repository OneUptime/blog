# Validation Summary: How to Verify MetalLB Installation Is Working Correctly

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services and Deployments
- kubectl
- MetalLB
- MetalLB IPAddressPool CRD
- MetalLB L2Advertisement CRD
- Layer 2 ARP/NDP advertisement

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB v0.16.0 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-native.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The post listed a missing L2Advertisement as a common cause of `EXTERNAL-IP` staying `<pending>`. MetalLB documentation separates IP allocation from service advertisement; an L2Advertisement is required for L2 reachability, but allocation depends on a compatible IPAddressPool and controller state. I replaced that bullet with "No IPAddressPool is compatible with the service."
- The post suggested `ping` as a Layer 2 reachability check for the LoadBalancer IP. Kubernetes Services do not generally proxy ICMP, and MetalLB documentation recommends `arping` from the same L2 subnet to verify ARP advertisement. I changed the check to `arping` and clarified what a successful ARP test means.
- The L2Advertisement command comment said the advertisement must reference the pool. MetalLB supports an omitted pool selector/list, which applies the advertisement to all pools. I changed the wording to "apply to your IP address pool."

## Review Notes
`kubectl` was not installed in the local workspace, so CLI command syntax was checked against Kubernetes generated command documentation and official Kubernetes object examples rather than local `kubectl --help` output. The MetalLB CRD API versions and resource field names in the YAML examples are current in the official MetalLB API reference.
