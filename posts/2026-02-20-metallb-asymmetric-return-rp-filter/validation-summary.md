# Validation Summary: How to Troubleshoot MetalLB Asymmetric Return Path with rp_filter

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and `externalTrafficPolicy`
- MetalLB layer 2 mode
- Linux `rp_filter` and `log_martians` sysctls
- `tcpdump`, `sysctl`, `nstat`, and `kubectl debug`
- OpenShift Node Tuning Operator / TuneD custom resources
- OneUptime monitoring

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB layer 2 concepts: https://metallb.io/concepts/layer2/
- Kubernetes external LoadBalancer documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- OpenShift Node Tuning Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/scalability_and_performance/using-node-tuning-operator
- OneUptime website: https://oneuptime.com
- Local command help for `sysctl`, `netstat`, and `nstat`

## Issues Found
- The post said `rp_filter` drops the reply packet because the VIP is not local on Node 2. `rp_filter` validates incoming packet sources, so the likely drop point is the forwarded request arriving on the backend node, before the pod receives it. Updated the explanation and diagrams to describe the incoming-packet check accurately.
- The post described the MetalLB L2 return path as Node 2 replying directly to the client. With default Kubernetes `externalTrafficPolicy: Cluster`, kube-proxy can obscure the source IP and route replies through conntrack/NAT, so the diagram was changed to avoid implying a universal direct return path.
- The post said any `rp_filter=1` value is likely the issue. Linux uses the maximum of `conf/all/rp_filter` and the receiving interface's setting, so the diagnosis text now explains the effective value.
- The disable instructions only set `all` and `default` to `0`. Because existing per-interface values can still keep filtering enabled, the command now also clears current per-interface `rp_filter` values.
- The drop-statistics commands used only legacy conntrack stats and `netstat`. Updated them to include `nstat` and the current `/proc/net/stat/nf_conntrack` path while retaining the legacy fallback.
- The Node Tuning Operator section showed a Kubernetes DaemonSet instead of an OpenShift `Tuned` custom resource. Replaced it with a valid `tuned.openshift.io/v1` `Tuned` example using the `[sysctl]` plugin.

## Review Notes
The corrected post is technically sound as a general troubleshooting guide. Exact packet paths can still vary by kube-proxy mode, CNI implementation, service traffic policy, and whether source NAT is applied, so future revisions could call out those environment-specific differences more explicitly.
