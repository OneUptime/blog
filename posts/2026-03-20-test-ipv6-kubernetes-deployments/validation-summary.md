# Validation Summary: How to Test IPv6 Kubernetes Deployments

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Services and LoadBalancer Services
- Kubernetes IPv4/IPv6 dual-stack networking
- Kubernetes DNS A/AAAA records
- Kubernetes NetworkPolicy
- kubectl JSONPath, run, expose, patch, and rollout commands
- BusyBox ping and nslookup
- curl IPv6 testing

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl run` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl create deployment` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl patch` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes container command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes OpenAPI schema for `LoadBalancerIngress`: https://raw.githubusercontent.com/kubernetes/kubernetes/master/api/openapi-spec/swagger.json
- Official curl container README: https://github.com/curl/curl-container/blob/main/README.md
- Official curl container entrypoint: https://github.com/curl/curl-container/blob/main/etc/entrypoint.sh
- Local BusyBox 1.36 `ping --help` output for `ping -6` support

## Issues Found
- The post assumed IPv6 addresses were always at `.status.podIPs[1]` and `.spec.clusterIPs[1]`. Kubernetes ordering depends on the configured primary IP family, so the examples now extract the first address containing `:` from the reported IP lists.
- The Service example used `kubectl expose` alone while describing a dual-stack service. Kubernetes Services default to the first configured service cluster IP family unless `ipFamilyPolicy` requests dual stack, so the post now patches the Service to `RequireDualStack`.
- The ping examples executed `ping6` inside the `nginx:stable` application container. Application images are not a reliable place to assume debug tools exist, so the examples now use temporary BusyBox pods and `ping -6`.
- The `curlimages/curl` examples passed `curl` as an argument to an image intended to run curl as its command. The examples now pass curl flags after `--` and use `--rm --attach` so output is shown and temporary pods are cleaned up.
- The DNS test used a temporary BusyBox pod without `--command`, which could be interpreted as image arguments rather than the command to run. It now uses `--command -- nslookup`.
- The NetworkPolicy test implied enforcement without mentioning prerequisites. The post now notes that a network plugin with Kubernetes NetworkPolicy enforcement is required, and the expected failure is worded as "fail or time out" because behavior varies by plugin.
- The LoadBalancer test assumed the status always reports an IPv6 literal in `.status.loadBalancer.ingress[0].ip`. Kubernetes load balancer status can report an IP or hostname, so the example now handles both and notes that the provider must support IPv6 LoadBalancer addresses.
- The CI snippet checked for `::`, which is not guaranteed in every textual IPv6 representation and was applied to structured output. It now checks extracted IP values for `:`.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was checked against Kubernetes generated CLI references rather than local `kubectl --help`.
- The later Service, DNS, and LoadBalancer tests assume the cluster is dual-stack-capable and that the CNI/cloud provider supports the IPv6 behavior being validated.
