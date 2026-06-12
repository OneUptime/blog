# Validation Summary: How to Use Nomad with Consul

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- HashiCorp Nomad
- HashiCorp Consul
- Consul service mesh / Connect
- Consul DNS
- Consul intentions and configuration entries
- Nomad job HCL
- Nomad templates with Consul Template and Vault
- Docker task driver

## Sources Consulted
- Nomad service job specification: https://developer.hashicorp.com/nomad/docs/job-specification/service
- Nomad check job specification: https://developer.hashicorp.com/nomad/docs/job-specification/check
- Nomad connect job specification: https://developer.hashicorp.com/nomad/docs/job-specification/connect
- Nomad gateway job specification: https://developer.hashicorp.com/nomad/docs/job-specification/gateway
- Nomad expose job specification: https://developer.hashicorp.com/nomad/docs/job-specification/expose
- Nomad sidecar_task job specification: https://developer.hashicorp.com/nomad/docs/job-specification/sidecar_task
- Nomad network job specification: https://developer.hashicorp.com/nomad/docs/job-specification/network
- Nomad template job specification: https://developer.hashicorp.com/nomad/docs/job-specification/template
- Nomad vault job specification: https://developer.hashicorp.com/nomad/docs/job-specification/vault
- Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- Consul config CLI reference: https://developer.hashicorp.com/consul/commands/config
- Consul intention CLI reference: https://developer.hashicorp.com/consul/commands/intention
- Consul DNS reference: https://developer.hashicorp.com/consul/docs/reference/dns
- Consul DNS agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/dns

## Issues Found
- The HTTP health check comments incorrectly described `success_before_passing` and `failures_before_critical` as expected status code settings. Updated the comments to describe them as check transition thresholds.
- The Connect sidecar `expose` example reused the application `http` port as the exposed listener port. Added a dedicated `health` port and used it as `listener_port`, matching Nomad's expose path requirements.
- The ingress gateway example manually started `consul connect envoy` even though Nomad gateway jobs inject and manage the Envoy gateway task. Replaced the manual task with a `sidecar_task` resource configuration inside the `connect` block.
- The intention CLI creation examples used the deprecated `consul intention create` workflow. Removed those examples and kept the current `service-intentions` configuration entry workflow.
- The intention verification examples used deprecated list/get commands. Replaced them with `consul config list -kind service-intentions` and `consul config read -kind service-intentions -name api-service`; kept `consul intention check` for the L4 decision check.
- The Vault block used the older `policies` field. Updated it to the current `role` field.
- The Vault environment template used shell `export` syntax with `env = true`. Replaced it with `KEY=value` lines and `toJSON` escaping, as Nomad parses env templates as key/value pairs.
- The Consul DNS datacenter query was missing the `.dc` label. Updated `web-app.service.dc2.consul` to `web-app.service.dc2.dc.consul`.
- The DNS configuration used deprecated `udp_answer_limit` and had an incorrect comment for `enable_truncate`. Replaced it with `a_record_limit` and corrected the comment.
- The prepared query example was JSON but labeled as HCL and referenced an `.hcl` file. Changed the fence to JSON and updated the filename to `prepared-query.json`.

## Review Notes
The post is generally accurate after the fixes. The examples are illustrative and still assume supporting infrastructure such as running Nomad and Consul agents, available Consul service mesh configuration, Envoy support, Docker networking, Vault integration, and appropriate ACL tokens.
