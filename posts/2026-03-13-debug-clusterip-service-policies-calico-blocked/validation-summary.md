# Validation Summary: How to Debug ClusterIP Service Policies in Calico When Traffic Is Blocked

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Calico NetworkPolicy
- Kubernetes ClusterIP Services
- calicoctl
- kubectl
- Network policy staging

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico policy for services exposed externally as cluster IPs: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico Kubernetes service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico staged network policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico `calicoctl apply` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The introduction described "ClusterIP Service Policies" as if it were a distinct Calico resource. Calico documents `NetworkPolicy` rules that select endpoints or Kubernetes Services, and policies for externally advertised ClusterIPs. I changed the wording to refer to Calico network policies securing traffic to pods behind ClusterIP Services.
- The post implied that any source can reach ClusterIP services. Kubernetes ClusterIP Services are normally internal to the cluster, while Calico can advertise ClusterIPs externally with BGP. I clarified that the exposure risk applies to NodePorts or ClusterIPs advertised outside the cluster.
- The egress database rule repeated the `destination` key, so normal YAML parsing would discard the selector and keep only the port list. I combined the selector and port under one `destination` map.
- The TCP service rules matched destination ports without an explicit `protocol`. Calico examples use `protocol: TCP` with TCP port rules, so I added it to the application and database rules.
- The verification command used a pod in the `test` namespace, but a namespaced Calico `NetworkPolicy` selector is scoped to the policy namespace unless a `namespaceSelector` is set. I changed the command to use a `production` namespace frontend pod.
- The architecture diagram labeled Calico policy as acting directly on the ClusterIP Service. I updated the label to show kube-proxy selecting an endpoint before Calico policy is evaluated for the backend pod traffic path.

## Review Notes
The post is technically relevant and validated after corrections. In a future revision, the guide could be more explicit about whether it is demonstrating endpoint-selector policy for service backends or Calico service-name matches using `source.services` and `destination.services`.
