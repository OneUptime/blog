# Validation Summary: How to Automate Calico eBPF Troubleshooting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kubectl
- Linux eBPF and bpftool
- Bash scripting

## Sources Consulted
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico eBPF enablement documentation: https://docs.tigera.io/calico/latest/maintenance/enabling-bpf
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- GNU Bash redirection documentation: https://www.gnu.org/s/bash/manual/html_node/Redirections.html

## Issues Found
- The diagnostic bundle script used `calico-node -bpf-nat-dump` and `calico-node -bpf-conntrack-dump`. Current Calico documentation shows the embedded BPF tool as `calico-node -bpf <args>`, with NAT and conntrack dumps run as `calico-node -bpf nat dump` and `calico-node -bpf conntrack dump`. Updated both commands.
- The diagnostic summary counted collected nodes with `ls ${BUNDLE_DIR}/nodes/ | wc -l`, but the `nodes` directory was not guaranteed to exist if no per-node data was collected, and the path was unquoted. Created the directory up front and changed the count to a quoted `find` command that counts node directories.
- The health check used `grep -c calico || echo 0`. Because `grep -c` prints `0` and exits with status 1 when there are no matches, this could assign `0` followed by another `0` to `programs`, causing the numeric comparison to fail. Changed it to preserve grep's count output and default empty output to `0`.

## Review Notes
The connectivity test uses Bash's `/dev/tcp` redirection, so it requires Bash and tests TCP reachability only. That is technically valid for the shown shell script, but it does not perform a DNS query or validate UDP DNS behavior.
