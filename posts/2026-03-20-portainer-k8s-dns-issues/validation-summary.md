# Validation Summary: How to Troubleshoot Kubernetes DNS Issues in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- Portainer
- Kubernetes NetworkPolicy
- `kubectl`
- DNS service discovery

## Sources Consulted
- Kubernetes: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: Endpoints API reference - https://kubernetes.io/docs/reference/kubernetes-api/service-resources/endpoints-v1/
- Kubernetes: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- CoreDNS: `kubernetes` plugin - https://coredns.io/plugins/kubernetes/
- CoreDNS: `autopath` plugin - https://coredns.io/plugins/autopath/
- CoreDNS: `forward` plugin - https://coredns.io/plugins/forward/

## Issues Found
- The post used `kubectl get endpoints` / `kubectl get ep` for DNS backend checks. I replaced these with `EndpointSlice` queries because the Endpoints API is legacy and deprecated in Kubernetes v1.33+.
- The NetworkPolicy fix included `- {}` under `egress`, which effectively allows all outbound traffic because egress rules are additive. I replaced it with a rule that allows only TCP/UDP 53 traffic to the CoreDNS pods in `kube-system`.
- The cluster-domain detection command grepped for `cluster.local`, which only works when the cluster uses the default domain. I changed it to inspect the CoreDNS `kubernetes` plugin line in the Corefile.
- The CoreDNS application step said a restart was required to apply ConfigMap changes. I corrected this to note that ConfigMap propagation can take a minute or two, and that a rollout restart is optional if immediate pickup is needed.
- One sample error message mixed a DNS lookup failure with `Connection refused`, which is a different failure mode. I replaced it with a real DNS resolution error example.
- The `dig` examples hard-coded `10.96.0.10` as the DNS Service IP. I changed them to use a placeholder tied to the `kube-dns` ClusterIP from Step 3 so the commands are portable across clusters.
- The post said CoreDNS should show `2+` running pods. I relaxed that to `one or more` because healthy clusters can be configured with a single replica.
- The `autopath` tuning note was incomplete. I added the required caveat that it needs the CoreDNS `kubernetes` plugin configured with `pods verified`.
- Two fenced code blocks used the wrong language hint (`bash` for YAML and `yaml` for shell). I corrected those to match the actual content.

## Review Notes
- The `dig` step still relies on the third-party `tutum/dnsutils` image. It exists, but it is not part of the official Kubernetes docs; replacing it with a maintained, documented utility image in a future revision would reduce dependency risk.
- If a cluster uses NodeLocal DNSCache, DNS egress may target the node-local listener rather than the CoreDNS pods directly, so the example NetworkPolicy would need to be adjusted.
- Manual `kubectl scale deployment coredns --replicas=3` is technically valid, but clusters with DNS autoscaling enabled may later reconcile that replica count automatically.
