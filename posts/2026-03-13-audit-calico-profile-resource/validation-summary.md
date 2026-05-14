# Validation Summary: Audit Calico Profile Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Profile resources
- Calico Kubernetes controllers
- Calico WorkloadEndpoint resources
- `calicoctl`
- Kubernetes namespaces
- `kubectl`
- Bash
- Python JSON processing

## Sources Consulted
- Calico Profile resource documentation: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Kubernetes controllers configuration documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico KubeControllersConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico namespace-to-profile conversion source: https://github.com/projectcalico/calico/blob/ed3de7a700eaa704c590b2e79e4dd40156fb7731/libcalico-go/lib/backend/k8s/conversion/conversion.go#L87-L118
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Namespace profile rules were described as suspicious whenever any ingress or egress rules were present. Calico's namespace-to-profile conversion generates default allow ingress and egress rules for Kubernetes namespace profiles, so the audit check would incorrectly flag healthy profiles. Updated the text, Python check, diagram, and report template to flag only non-default rule drift.
- The custom profile export wrote JSON output to `current-custom-profiles.yaml` and compared it with `profiles-baseline.yaml`. Updated the example to use `.json` filenames consistently because the snippet emits JSON.

## Review Notes
Calico Profile `ingress` and `egress` fields are documented as deprecated in favor of NetworkPolicy and GlobalNetworkPolicy, but they still appear in generated namespace profiles as default allow rules. Future revisions could mention that distinction explicitly if the post expands beyond audit commands.
