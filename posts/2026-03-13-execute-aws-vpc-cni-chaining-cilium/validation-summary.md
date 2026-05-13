# Validation Summary: Execute AWS VPC CNI Chaining with Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- AWS VPC CNI
- Amazon EKS
- Kubernetes
- Helm
- Hubble
- eBPF

## Sources Consulted
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium command reference and cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Amazon EKS VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS VPC CNI network policy documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html

## Issues Found
- The post claimed chaining provides L3/L4/L7 policy enforcement and transparent encryption without qualification. Cilium's AWS CNI chaining documentation notes that L7 policy and IPsec transparent encryption are limited in chaining mode, so the text was narrowed to L3/L4 policy enforcement and Hubble observability with a chaining-mode limitation note.
- The prerequisites used a generic Kubernetes 1.26+ requirement and did not specify the AWS VPC CNI compatibility floor. Updated this to require an EKS version supported by the chosen Cilium release and AWS VPC CNI 1.11.2 or newer.
- The Helm example pinned Cilium 1.15.0 and included values that are not part of the current official AWS CNI chaining example. Updated the command to Cilium 1.19.4 and aligned the Helm values with the official Cilium AWS CNI chaining guide.
- The post omitted that existing pods must be restarted before the new CNI chain and policy enforcement apply to them. Added a note after installation.
- The Cilium configuration verification command searched for `chaining-mode`, while the installed ConfigMap key is `cni-chaining-mode`. Updated the grep pattern.
- The post used `cilium policy get` from the standalone Cilium CLI, but the current Cilium CLI does not provide that command. Replaced it with `kubectl get cnp allow-http-ingress -n default`.
- The Hubble UI recommendation assumed the UI was already enabled. Added the required `cilium hubble enable --ui` step before using `cilium hubble ui`.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically valid for the `cilium.io/v2` API. Future improvements could add actual traffic-generation commands to prove allowed and denied flows, but the existing post remains a concise install-and-verify tutorial.
