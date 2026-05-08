# Validation Summary: How to Update the Calico KubeControllersConfiguration Resource Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- KubeControllersConfiguration
- calico-kube-controllers
- calicoctl
- kubectl
- Kubernetes HostEndpoint and GlobalNetworkPolicy resources

## Sources Consulted
- Calico KubeControllersConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Kubernetes controllers configuration reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico LoadBalancer IP address management guide: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Project Calico Go API reference for KubeControllersConfiguration fields: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The post said automatic host endpoints create resources on every node interface. Calico's current API describes auto-created default host endpoints as HostEndpoint resources for nodes, and default host endpoints can represent all host interfaces. Updated the wording to avoid implying one resource per interface.
- The full-spec `calicoctl apply` example omitted currently documented controller sections such as `serviceAccount` and `loadBalancer`. Because `calicoctl apply` replaces the full resource spec, this could accidentally disable those controllers. Added the missing controller sections and clarified that existing sections should be preserved.
- The disabling-controller example said only `workloadEndpoint` was removed, but the snippet also omitted other controllers. Added `serviceAccount`, `namespace`, and `loadBalancer` so the example matches the text more closely.
- The cleanup command used `calicoctl get hostendpoints -o name`, but Calico documents supported `calicoctl get` output formats as `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`; `name` is not supported. Replaced it with `calicoctl get hostendpoints -o yaml | calicoctl delete -f -`, which matches documented stdin/file support for `calicoctl delete`.

## Review Notes
Some controller behavior is datastore-specific: the policy, workload endpoint, namespace, and service account controllers are documented as valid for etcd-backed Calico datastore usage. The post's prerequisite to understand which controllers are active is important, and operators should preserve cluster-specific controller sections when applying full-resource YAML.
