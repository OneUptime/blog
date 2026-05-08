# Validation Summary: Validate Calico Profile Resource

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico Profile resources
- Calico WorkloadEndpoint resources
- Calico namespace profiles
- calicoctl
- Kubernetes Pods and Services
- kubectl
- Python JSON parsing

## Sources Consulted
- Calico Profile resource documentation: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Cloud Kubernetes demo showing generated namespace profile labelsToApply: https://docs.tigera.io/calico-cloud/network-policy/beginners/simple-policy-cnx
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The post said profile-applied labels should be visible on the WorkloadEndpoint and used a command that checked `metadata.labels` for `pcns.projectcalico.org/name`. Calico documents `labelsToApply` on the Profile and endpoint profile assignment via `spec.profiles`; generated namespace profile labels are supplied by the profile. I changed the validation command to check the `kns.production` profile's `labelsToApply` and confirm each endpoint references that profile.
- The diagram suggested directly updating the WorkloadEndpoint `profiles` field when profile assignment is missing. Calico documentation notes WorkloadEndpoint lifecycle is generally handled by orchestrator-specific plugins such as Calico CNI, so I changed the action to check Calico CNI and profile synchronization.
- The traffic test attempted to access `http://receiver.production` after creating only a Pod named `receiver`. Kubernetes Pod creation does not create a Service DNS name by itself. I added `kubectl expose pod receiver`, used the fully qualified service DNS name, waited for both Pods to be ready, and deleted the Service during cleanup.

## Review Notes
Calico Profile ingress and egress rules are documented as deprecated in favor of NetworkPolicy and GlobalNetworkPolicy. The post still discusses testing profile rules because it is specifically about validating Profile resources, but future posts should prefer Calico policy resources for new policy design.
