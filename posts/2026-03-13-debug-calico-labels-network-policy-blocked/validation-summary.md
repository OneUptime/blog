# Validation Summary: How to Debug Calico Label-Based Network Policy When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Calico Open Source
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Calico WorkloadEndpoint
- Kubernetes pods, namespaces, deployments, and labels
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl get` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl label` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The WorkloadEndpoint check used `calicoctl get workloadendpoint my-pod`, implying the WorkloadEndpoint name is the pod name. Calico WorkloadEndpoint names are generated and commonly include node, orchestrator, pod name, and endpoint information. Changed the command to list WorkloadEndpoints in the namespace and search for `pod: my-pod`.
- The same WorkloadEndpoint command grepped for a `policies` field. Calico's WorkloadEndpoint resource schema documents labels and profiles, not a direct applied-policy list field. Updated the step to inspect the endpoint labels that Calico policy selectors match.
- The selector test used `kubectl get pods -l`, which is valid for Kubernetes label-selector syntax but does not support the full Calico selector language. Clarified that this test applies to simple equality-based selectors.

## Review Notes
The post is technically relevant and the remaining commands are consistent with the referenced Kubernetes and Calico documentation. Future improvements could mention that Calico selectors support a richer expression syntax than Kubernetes label selectors, so complex Calico selectors must be translated carefully when using `kubectl get pods -l` as a quick check.
