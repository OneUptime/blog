# Validation Summary: How to Configure MetalLB for IPv4 Load Balancing in Bare-Metal Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MetalLB
- Kubernetes Services
- `kubectl`
- IPv4 networking
- ARP / Layer 2 service advertisement

## Sources Consulted
- MetalLB installation docs: https://metallb.io/installation/
- MetalLB configuration docs: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration docs: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB usage docs: https://metallb.io/usage/index.html
- MetalLB troubleshooting docs: https://metallb.io/troubleshooting/
- MetalLB layer 2 concepts docs: https://metallb.io/concepts/layer2/
- Upstream MetalLB manifest for the current documented release: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The install command pinned MetalLB to `v0.14.5`, while the current official installation docs point to `v0.15.3`. Updated the manifest URL to `v0.15.3` so the tutorial matches the current documented release.
- The tutorial omitted a required prerequisite for some environments: when `kube-proxy` runs in IPVS mode, MetalLB requires `strictARP: true`. Added that note from the official installation docs.
- The tutorial also omitted the Layer 2 memberlist networking requirement. Added a note that TCP and UDP port `7946` must be open between cluster nodes.
- The alternate CIDR example used `192.168.1.200/28`, which is not a CIDR-aligned subnet representation for the example. Replaced it with a valid CIDR-aligned example, `192.168.1.240/28`.
- The `autoAssign` comment said the configuration would prevent automatic assignment, but `autoAssign: true` does the opposite. Updated the comment so it matches the YAML behavior.
- The service example assumed a backing workload but did not say so. Added a note that Pods labeled `app: my-web-app` must already exist and listen on port `8080`.
- The ARP verification used `arp -n`, which only inspects the local ARP cache and is not the verification flow recommended in MetalLB’s troubleshooting docs. Replaced it with `arping -I <interface> <ip>` and added a service-event check with `kubectl describe svc`.
- The log example used `| tail -20` after `kubectl logs -l ...`; with selectors, `kubectl logs` has its own tail behavior. Replaced it with `kubectl logs ... --tail=20`.
- The final explanation said one node acts as the “speaker.” More precisely, one node announces a given service IP in L2 mode. Updated the wording to match MetalLB’s layer 2 documentation.

## Review Notes
- The post is technically sound after the fixes above.
- The install manifest is version-pinned. Future revalidation should confirm the version referenced by the official MetalLB installation docs.
