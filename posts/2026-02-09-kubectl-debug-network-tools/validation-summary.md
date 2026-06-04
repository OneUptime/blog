# Validation Summary: How to Use kubectl debug with Network Tools for Connectivity Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl debug
- Ephemeral containers
- Kubernetes Services and DNS
- EndpointSlices
- NetworkPolicy
- tcpdump, netshoot, iperf3, OpenSSL, curl, netcat

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes Debugging Nodes With Kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- nicolaka/netshoot package list and examples: https://github.com/nicolaka/netshoot

## Issues Found
- The Service connectivity section implied that DNS resolution for a normal Service should be compared with backend endpoint IPs. Kubernetes DNS resolves normal ClusterIP Services to the Service ClusterIP, while backend pod IPs are represented through EndpointSlices. Updated the commands and explanation to compare DNS with the Service ClusterIP and use EndpointSlices for backend endpoints.
- The post used the legacy `endpoints` resource in a watch example. The Endpoints API is deprecated in current Kubernetes documentation in favor of EndpointSlices. Updated the example to use `kubectl get endpointslices -l kubernetes.io/service-name=my-service`.
- The `--target` section said it shared the target container's exact network environment. Pod containers already share the pod network namespace; `--target` targets the process namespace for the ephemeral container when supported by the runtime. Updated the section and best practice wording.
- The packet capture example wrote a pcap inside the ephemeral container but copied it without selecting that container. Updated the debug command to assign a known ephemeral container name and the `kubectl cp` command to use `-c netdebug`.
- The node debug example included privileged node inspection but did not request a privileged debug profile. Updated the command to use `--profile=sysadmin`, matching Kubernetes node debug guidance for privileged node-level troubleshooting.

## Review Notes
The local environment did not have `kubectl` installed, so CLI behavior was verified against the current official Kubernetes command reference and task documentation instead of local `kubectl --help` output.
