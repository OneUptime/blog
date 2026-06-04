# Validation Summary: How to Diagnose Service Mesh Sidecar Proxy Connection Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Istio sidecar mode
- Envoy proxy
- Linkerd proxy
- Service mesh networking
- mTLS
- iptables and CNI traffic redirection

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio CNI documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio istioctl diagnostic tooling documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio Envoy and Istiod debugging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio egress traffic documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio egress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio traffic mirroring documentation: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio application requirements and proxy ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Linkerd proxy metrics documentation: https://linkerd.io/2-edge/reference/proxy-metrics/

## Issues Found
- The sidecar injection checks only inspected `.spec.containers` and `containerStatuses`. Current Istio documentation notes that on Kubernetes 1.33+ sidecars can be injected as native sidecars under `initContainers`, so I changed the commands to inspect both normal containers and init containers.
- The namespace injection check only looked for `istio-injection`. Current Istio deployments may use revision labels such as `istio.io/rev`, so I updated the check to include both labels.
- The post said `kubectl exec` into the application container bypasses the proxy for outgoing traffic. In an injected Istio sidecar pod, application traffic is still captured by iptables/CNI redirection. I changed the section to explain that a non-injected pod or traffic capture exclusion is needed for comparison.
- The Envoy `config_dump` examples selected fixed `.configs[]` array indexes. Envoy config dump ordering is not a stable troubleshooting contract, so I changed the `jq` examples to select cluster and route dumps by `@type`.
- The Istio control-plane connectivity example used plain HTTP `curl` against port `15012` and described the expected result too loosely. I changed it to `https://` with verbose TLS output and replaced the proxy sync check with the documented `istioctl proxy-status`.
- The ServiceEntry snippet used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1`, so I updated the API version and made the snippet an executable heredoc before `kubectl apply`.
- The post said missing ServiceEntries block external access in "strict mode." I changed this to the precise Istio setting, `meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY`.
- The mirroring section implied an unhealthy mirror target can directly affect primary traffic. Istio mirrors requests out of band and discards mirrored responses, so I clarified that the main risk is excess proxy and network resource consumption.
- The proxy bypass section annotated an existing pod with `sidecar.istio.io/inject=false`, then deleted it. Istio injection happens at pod creation time and per-pod injection should be set on the workload pod template before new pods are created. I changed the example to patch a Deployment pod template and roll it out.
- The egress gateway check assumed a Deployment named `istio-egressgateway`. Istio's current task documentation checks egress gateway pods with the `istio=egressgateway` label, so I updated the command.

## Review Notes
The remaining commands are generally valid troubleshooting examples, but several are environment-dependent: ephemeral debug containers require cluster support and permissions, `kubectl top` requires Metrics Server, and direct access to Envoy admin endpoints depends on the proxy image and local admin-port configuration.
