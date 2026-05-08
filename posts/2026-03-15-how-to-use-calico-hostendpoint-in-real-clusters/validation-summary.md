# Validation Summary: How to Use the Calico HostEndpoint Resource in Real Clusters

## Status
validated

## Post Type
Tutorial / production configuration guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Calico KubeControllersConfiguration
- calicoctl
- Kubernetes node labels and control-plane ports
- Kubernetes HostEndpoint-based node security

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico KubeControllersConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Protect Kubernetes nodes documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico Kubernetes system requirements and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Ports and Protocols documentation: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The control-plane policy used `node-role.kubernetes.io/control-plane == ''`. Calico's own Kubernetes node HostEndpoint examples select control-plane nodes with `has(node-role.kubernetes.io/control-plane)`, so the selector was changed to that form.
- The control-plane ingress policy denied Kubernetes control-plane ports without first allowing localhost traffic. Calico's Kubernetes node HostEndpoint guidance preserves localhost access for control-plane processes, so an allow rule for `127.0.0.0/8` was added.
- The control-plane policy allowed worker-labeled sources to access etcd ports `2379` and `2380`. Kubernetes documents these as control-plane/etcd ports, not worker-node ports, so the rule was changed to allow control-plane sources for `2379`, `2380`, and `10250`.
- The worker SSH policy selected `node-role == 'worker'`, which is not a standard Kubernetes node label and would not work unless users created that exact label. The example now labels worker nodes with `kubernetes-worker=` and selects `has(kubernetes-worker)`, matching Calico's documented automatic HostEndpoint label-sync pattern.
- The node egress policy denied all traffic except HTTP, HTTPS, and DNS, which could break Kubernetes and Calico control traffic. The example now preserves common Kubernetes ports and Calico networking ports/protocols documented by Kubernetes and Calico.
- The HostEndpoint count verification used `calicoctl get hostendpoint -o wide | wc -l`, which counts the table header. It was replaced with a `go-template` command that emits one line per HostEndpoint before piping to `wc -l`.

## Review Notes
The examples are still intentionally generic. Real production clusters should adjust allowed sources, service ports, Calico dataplane requirements, and monitoring labels for their topology, datastore, and CNI mode before enforcing deny rules.
