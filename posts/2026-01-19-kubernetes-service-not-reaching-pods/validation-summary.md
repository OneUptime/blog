# Validation Summary: How to Debug Kubernetes Service Not Reaching Pods

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Pods and readiness probes
- EndpointSlices and Endpoints
- Kubernetes DNS and CoreDNS
- Kubernetes NetworkPolicy
- kube-proxy
- kubectl
- Linux networking tools: iptables, IPVS, nftables

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes Virtual IPs and Service Proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Liveness, Readiness, and Startup Probes task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- BusyBox debug pod example included a `curl` command immediately after launching `busybox:1.36`. BusyBox commonly provides `wget`, not `curl`, so the post now marks the `curl` command as only applicable when using an image that includes curl.
- kube-proxy mode guidance mentioned only iptables and IPVS. Current Kubernetes documentation also lists nftables as a Linux proxy mode, and nftables is stable as of Kubernetes v1.33. Updated the mode comment and added an nftables inspection command.
- Direct Pod connectivity example set `POD_IP` in the local shell, then opened an interactive BusyBox shell where that variable would not exist. Updated the command to run `wget` directly from the debug pod so local shell expansion supplies the Pod IP.
- Wrong port configuration section said Service `targetPort` must match `containerPort`. Kubernetes Services route to the Pod port specified by `targetPort`, which can be numeric or named; `containerPort` documents/exposes the container port but is not required for Service routing. Updated the wording to say `targetPort` must match the app's actual listening port.
- A `kubectl exec` command for manually checking a readiness endpoint was included inside a YAML code block. Split it into a separate Bash block so the YAML snippet remains syntactically valid.
- The NetworkPolicy example combined ingress and egress isolation, but the suggested allow policy only opened ingress. Updated the deny example to an ingress-only deny policy so the same-namespace ingress allow rule is a consistent fix for service traffic to selected Pods.

## Review Notes
The remaining commands and YAML snippets align with current Kubernetes concepts and kubectl usage. Some examples assume common add-ons and labels, such as CoreDNS pods labeled `k8s-app=kube-dns` and kube-proxy running as a DaemonSet in `kube-system`; these are typical but can vary by distribution or managed Kubernetes provider.
