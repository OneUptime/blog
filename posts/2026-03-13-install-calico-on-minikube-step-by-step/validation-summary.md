# Validation Summary: How to Install Calico on Minikube Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Minikube
- Kubernetes
- kubectl
- Calico Open Source
- Kubernetes CNI
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- LoadBalancer services with `minikube tunnel`

## Sources Consulted
- Calico Open Source documentation: Quickstart for Calico on minikube, https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico Open Source documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Minikube command reference: `minikube start`, https://minikube.sigs.k8s.io/docs/commands/start/
- Minikube handbook: Network Policy, https://minikube.sigs.k8s.io/docs/handbook/network_policy/
- Minikube command reference: `minikube tunnel`, https://minikube.sigs.k8s.io/docs/commands/tunnel/
- Calico v3.32.0 manifest, https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml

## Issues Found
- The introduction described Minikube as using "its own CNI configuration" by default. Minikube documentation identifies the default CNI as Kindnet, so this was corrected.
- The text said the `--cni` flag was introduced in newer Minikube versions. Current Minikube documentation lists `--cni` as a normal `minikube start` option, so the wording was made version-neutral.
- The prerequisites pinned only "Minikube v1.25+", which is incomplete when the Calico manifest version also has Kubernetes version support requirements. This was changed to require a current Minikube release using a Kubernetes version supported by the chosen Calico version.
- The manual startup command used `minikube start --network-plugin=cni --cni=false`. Current Calico minikube documentation uses `minikube start --network-plugin=cni` for the manifest method, so the command was updated.
- The manifest URL used Calico `v3.27.0`. The URL exists, but current Calico documentation uses `v3.32.0`, so the post was updated to the current manifest version.

## Review Notes
The post is technically relevant and the remaining commands are consistent with the official Minikube and Calico documentation. The `192.168.0.0/16` pod CIDR is Calico's default pool for the documented manifests, but users should choose a different pod CIDR if that range overlaps with their local network.
