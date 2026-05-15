# Validation Summary: How to Configure Kubernetes Networking with Calico CNI on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kubernetes
- Calico CNI
- Tigera Operator
- Kubernetes NetworkPolicy
- calicoctl

## Sources Consulted
- Calico operator installation manifest for v3.27.0: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
- Calico custom resources manifest for v3.27.0: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico install calicoctl documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The `allow-web` NetworkPolicy used `namespaceSelector.matchLabels.name: ingress`. Kubernetes does not provide a built-in `name` label for namespaces, so this policy would only work if the namespace had been manually labeled that way. Changed it to `kubernetes.io/metadata.name: ingress`, the standardized immutable label Kubernetes sets to the namespace name.

## Review Notes
- The Calico installation manifest and `Installation` resource fields match the v3.27.0 operator/custom-resources examples.
- The `10.244.0.0/16` IP pool is valid, but in a real cluster it should match the Kubernetes pod CIDR configured for the cluster.
- The calicoctl download command correctly pins the client to the same Calico version used in the installation commands.
