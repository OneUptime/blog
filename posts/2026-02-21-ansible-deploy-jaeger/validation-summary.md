# Validation Summary: How to Use Ansible to Deploy Jaeger for Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jaeger
- Jaeger Agent
- Jaeger Collector
- Jaeger Query
- Elasticsearch
- OpenTelemetry
- systemd
- cron

## Sources Consulted
- Jaeger 1.54 CLI flags: https://www.jaegertracing.io/docs/1.54/deployment/cli/
- Jaeger deployment and default ports: https://www.jaegertracing.io/docs/1.54/deployment/
- Jaeger sampling documentation: https://www.jaegertracing.io/docs/1.54/architecture/sampling/
- Jaeger download/version status page: https://www.jaegertracing.io/download/
- Jaeger v1.54.0 release page: https://github.com/jaegertracing/jaeger/releases/tag/v1.54.0
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html

## Issues Found
- The post described the deployment as production-grade without caveating that the Jaeger Agent and Jaeger v1 are legacy. I updated the introduction and variables section to explain that Jaeger Agent is deprecated and that this pinned 1.54 example is for existing agent-based deployments, while new OpenTelemetry deployments should prefer Jaeger v2 or an OpenTelemetry Collector.
- The collector environment file used `COLLECTOR_GRPC_HOST_PORT` and `COLLECTOR_HTTP_HOST_PORT`, but Jaeger 1.54 maps `--collector.grpc-server.host-port` and `--collector.http-server.host-port` to `COLLECTOR_GRPC_SERVER_HOST_PORT` and `COLLECTOR_HTTP_SERVER_HOST_PORT`. I corrected both environment variable names.
- The query environment file used `QUERY_HTTP_HOST_PORT`, but Jaeger uses `QUERY_HTTP_SERVER_HOST_PORT` for `--query.http-server.host-port`. I corrected the environment variable name.
- The collector role wrote the index cleaner log to `/var/log/jaeger/index-cleaner.log` without creating `/var/log/jaeger`. I added that directory to the collector role's directory creation loop.
- The Elasticsearch index cleaner task file was shown but not included from the collector role. I added an `include_tasks` step guarded by `jaeger_storage_type == "elasticsearch"`.
- The query role assumed the `jaeger` user, `/etc/jaeger` directory, and extracted Jaeger binaries already existed. I added the missing setup, download, and extract tasks so the role works when `jaeger_query` is not the same host as `jaeger_collector`.
- The verification playbook checked collector health at `/health`, but Jaeger's admin health endpoint is served at `/` on port 14269. I changed the URL to `http://localhost:14269/`.
- The verification playbook used `wait_for` against the agent's UDP compact port. `wait_for` checks TCP connectivity, so it is not appropriate for the UDP receiver. I added `jaeger_agent_admin_port`, configured the agent admin endpoint, and changed verification to use an HTTP health check on that admin port.
- The closing paragraph said OpenTelemetry SDKs can send traces to the local Jaeger Agent on port 6831. I changed it to state that Jaeger client libraries can use `localhost:6831`, while new OpenTelemetry SDK deployments should send OTLP to the collector on ports 4317 or 4318, or through an OpenTelemetry Collector.

## Review Notes
The corrected tutorial is technically consistent for a legacy Jaeger 1.54 agent-based deployment. However, Jaeger v1 is archived/EOL as of 2026, and the Jaeger Agent pattern is not recommended for new OpenTelemetry deployments.
