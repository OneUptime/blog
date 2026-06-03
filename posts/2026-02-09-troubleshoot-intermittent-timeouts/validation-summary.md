# Validation Summary: How to Troubleshoot Intermittent Connection Timeouts in Kubernetes

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Services and EndpointSlices
- Kubernetes DNS
- NetworkPolicy
- Readiness probes
- kube-proxy
- curl
- tcpdump
- hey
- Linux networking tools

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy
- curl command help for `--max-time`, `--write-out`, `--output`, and `--silent`
- Docker Hub `ricoli/hey` documentation: https://hub.docker.com/r/ricoli/hey

## Issues Found
- The baseline `kubectl run` command started `curlimages/curl` with `-- sh`, which would pass `sh` as an argument to the image entrypoint instead of overriding the command. Changed it to use `--command -- sh`.
- The service endpoint check used the legacy `Endpoints` resource. Changed it to watch `EndpointSlice` objects selected by `kubernetes.io/service-name`, which matches current Kubernetes guidance.
- The explanation that requests sent during restart or termination timeout was too absolute. Adjusted it to account for readiness, overloaded pods, terminating pods, and endpoint update timing.
- The NetworkPolicy section implied static policies could randomly block traffic. Reworded it to focus on policy changes, wrong selectors, namespace differences, and misapplied policies.
- The `kubectl top pods --watch` command used an unsupported `--watch` flag. Changed it to run `kubectl top pod` under the shell `watch` command.
- The packet capture example created an ephemeral debug container but copied the pcap without specifying that container. Added an explicit debug container name and `kubectl cp -c debugger`.
- The load test example attempted to open a shell in a hey image. Changed it to run the hey container directly with the documented `-z` and `-c` arguments.
- The backend health loop used brace expansion inside `sh -c`, which is not portable POSIX shell syntax. Replaced it with a POSIX-compatible counter loop.

## Review Notes
Some thresholds in the post, such as DNS latency and packet loss investigation thresholds, are practical guidance rather than Kubernetes-defined limits. They are reasonable as troubleshooting heuristics but should be tuned to the application, cluster networking, and SLOs.
