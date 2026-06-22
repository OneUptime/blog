# Validation Summary: How to Use Loki with Consul for Service Discovery

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Loki
- HashiCorp Consul
- Consul ACLs and KV store
- Kubernetes
- Helm
- Grafana Alloy
- Prometheus / PromQL

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki hash rings documentation: https://grafana.com/docs/loki/latest/get-started/hash-rings/
- Grafana Loki Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy `loki.write` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- HashiCorp Consul ACL rule reference: https://developer.hashicorp.com/consul/docs/reference/acl/rule
- HashiCorp Consul ACL policy command reference: https://developer.hashicorp.com/consul/commands/acl/policy/read
- HashiCorp Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul telemetry metrics reference: https://developer.hashicorp.com/consul/docs/reference/agent/telemetry
- Grafana dskit Consul KV client implementation: https://github.com/grafana/dskit/blob/main/kv/consul/client.go

## Issues Found
- Loki environment variable references such as `${CONSUL_ACL_TOKEN}` require `-config.expand-env=true`. Added that argument to the Kubernetes Deployment snippet using the token.
- The TLS snippet used unsupported Loki Consul client fields (`ca_path`, `cert_path`, and `key_path`). Replaced it with a technically accurate note that Loki's Consul ring client does not expose per-client TLS certificate settings and should use a local proxy or sidecar if TLS is required.
- The certificate mount example implied Loki itself would consume Consul client certificates. Changed it to mount certificates into a `consul-proxy` container.
- Promtail reached EOL on March 2, 2026. Replaced the Promtail client example with a current Grafana Alloy `loki.write` example.
- The Consul service health metric and alert used `service="loki"` even though the service registration example creates `loki-gateway`. Updated both to `service="loki-gateway"`.
- The troubleshooting command `consul health service loki` did not match the registered service name. Updated it to `consul health service loki-gateway`.
- The command `consul acl policy read loki` is not valid for reading a policy by name. Updated it to `consul acl policy read -name loki`.
- The Consul Helm install command assumed the HashiCorp repo and namespace already existed. Added `helm repo add hashicorp https://helm.releases.hashicorp.com` and `--create-namespace`.

## Review Notes
- Grafana Loki's own hash-ring documentation recommends `memberlist` unless there is a compelling reason to use another KV store. The post's Consul guidance is still valid for environments that already standardize on Consul or need Consul-specific operational controls.
- The Consul service registration example is a ConfigMap containing a Consul service definition; it still needs to be mounted into a Consul agent configuration path or otherwise applied by the deployment tooling.
