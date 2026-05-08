# Validation Summary: Creating the Calico StagedGlobalNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico StagedGlobalNetworkPolicy
- Kubernetes custom resources
- kubectl
- calicoctl
- Kubernetes network policy concepts

## Sources Consulted
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico API Go package reference for StagedGlobalNetworkPolicySpec and StagedAction values: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The post incorrectly stated that `spec.stagedAction` should be set to `Log`. The Calico API defines valid staged action values as `Set`, `Delete`, `Learn`, and `Ignore`, with `Set` as the default. Updated the explanation and manifest to use `stagedAction: Set`.
- The post presented `calicoctl apply` as the preferred path for enhanced validation. Current Calico documentation says newer releases perform defaulting and validation in the Calico API server and recommends `kubectl` for most Kubernetes API operations. Updated the text to use `kubectl apply` for applying and `calicoctl validate` only as an optional validation step.
- The verification section used `kubectl describe stagedglobalnetworkpolicy.projectcalico.org` without the resource name while saying it described the specific resource. Updated the command to include `staged-deny-untrusted-egress`.
- The verification section used `calicoctl get stagedglobalnetworkpolicy -o yaml`, but the current Calico `calicoctl get` reference does not list staged policy resources in its valid resource types. Replaced it with the documented `kubectl get stagedglobalnetworkpolicy.projectcalico.org staged-deny-untrusted-egress -o yaml`.
- The prerequisite stated "Calico v3.26 or later recommended" without tying it to availability of the staged policy API. Updated it to require a Calico installation where the `StagedGlobalNetworkPolicy` API is available.

## Review Notes
The remaining Calico policy fields in the manifest match the documented `projectcalico.org/v3` StagedGlobalNetworkPolicy structure. The later troubleshooting and recovery checklist is broad for a resource-creation tutorial, but the commands are generally plausible operational checks when adjusted to the user's Calico installation and namespace layout.
