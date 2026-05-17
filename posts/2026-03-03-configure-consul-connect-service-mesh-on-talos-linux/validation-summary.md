# Validation Summary: How to Configure Consul Connect Service Mesh on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- HashiCorp Consul / Consul Connect (service mesh)
- Talos Linux
- Kubernetes
- Helm 3
- Envoy (sidecar proxy)
- CoreDNS
- mTLS

## Sources Consulted
- Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- consul-k8s values.yaml: https://github.com/hashicorp/consul-k8s/blob/main/charts/consul/values.yaml
- Consul annotations and labels: https://developer.hashicorp.com/consul/docs/k8s/annotations-and-labels
- Consul CRDs on Kubernetes: https://developer.hashicorp.com/consul/docs/connect/k8s/crds
- ServiceIntentions config entry: https://developer.hashicorp.com/consul/docs/connect/config-entries/service-intentions
- `consul connect proxy` command: https://developer.hashicorp.com/consul/commands/connect/proxy
- `consul catalog nodes` command: https://developer.hashicorp.com/consul/commands/catalog/nodes
- HashiCorp Support — Accessing Envoy Logs for Consul: https://support.hashicorp.com/hc/en-us/articles/4409691756563

## Issues Found
1. **Invalid `consul connect proxy -show-config` command** — The `consul connect proxy` CLI subcommand does not have a `-show-config` flag (it is used to *start* the built-in proxy, not introspect Envoy). To inspect the running Envoy sidecar configuration, the correct approach is to query the Envoy admin API at port 19000. Replaced the line with:
   ```
   kubectl exec <POD_NAME> -c envoy-sidecar -- curl -s localhost:19000/config_dump
   ```

## Review Notes
- The `consul.hashicorp.com/connect-service-upstreams` annotation in the post uses the legacy unlabeled format (`"api-backend:8081"`). This still works but HashiCorp now recommends the labeled form (e.g., `"api-backend.svc:8081"`). Not changed because the legacy form is still valid and aligns with how many existing tutorials read.
- The `envoy-sidecar` container name is correct for Consul deployments using the classic client-agent model. In newer Consul versions using the `consul-dataplane` model, the injected container is named `consul-dataplane` instead. Readers on the very latest Consul versions may need to substitute the container name accordingly.
- The Helm chart values, CRD apiVersions (`consul.hashicorp.com/v1alpha1`), pod annotation names, `consul catalog` commands, and `kubectl get serviceintentions` usage all verified correctly against official documentation.
