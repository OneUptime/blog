# Validation Summary: Creating the Calico FelixConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- Felix
- kubectl
- calicoctl
- Prometheus metrics
- WireGuard
- Calico eBPF dataplane

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source Configuring Felix reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source Configure calicoctl documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Open Source Enable kubectl to manage Calico APIs documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico Open Source Enable native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Project Calico v3.26.0 and v3.32.0 CRD manifests: https://github.com/projectcalico/calico

## Issues Found
- Corrected the `ipipEnabled` description and removed `ipipEnabled: true` from the example manifest. Calico documents this field as an override for whether Felix configures the IPIP tunnel interface; normal Kubernetes encapsulation is usually configured through IP pool `ipipMode`.
- Changed the wording that called all manifest values "sensible defaults." Several values in the example, such as `healthEnabled: true` and `prometheusMetricsEnabled: true`, are useful examples but are not Calico's documented defaults.
- Clarified that `kubectl apply` against `projectcalico.org/v3` requires either the Calico API server or native `projectcalico.org/v3` CRDs. Without one of those, `calicoctl` is required for the Calico API group.
- Updated the `calicoctl apply` explanation to note that applying an update replaces the complete resource specification, so operators should provide the full intended spec.
- Fixed the verification command to describe the `default` FelixConfiguration resource explicitly.
- Added a namespace caveat for `calico-node` logs because operator installs commonly use `calico-system`, while some manifest-based installs use `kube-system`.
- Corrected troubleshooting guidance for the Calico API server namespace and added a check for whether the `projectcalico.org` API resources are available to `kubectl`.
- Replaced the label-based targeting example with the documented node-specific FelixConfiguration naming pattern, `node.<nodename>`. FelixConfiguration resources do not target nodes by Kubernetes labels.
- Clarified naming conventions for FelixConfiguration resources, which use `default` for global settings and `node.<nodename>` for node-specific overrides.

## Review Notes
- The manifest fields used in the post are present in the official Calico v3.26.0 and v3.32.0 CRD manifests.
- Restarting `calico-node` is usually not required for standard FelixConfiguration changes, but keeping it as a troubleshooting step is acceptable when components do not pick up configuration after verification.
