# Validation Summary: How to Deploy NATS on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- NATS
- JetStream
- Helm
- NATS CLI

## Sources Consulted
- NATS and Kubernetes docs: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS JetStream stream administration docs: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/streams
- NATS JetStream streams concept docs: https://docs.nats.io/nats-concepts/jetstream/streams
- Official NATS Helm chart README: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/README.md
- Official NATS Helm chart values: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- Official NATS Helm chart helpers used to verify default service naming: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/templates/_helpers.tpl
- Official NATS Helm chart `nats-box` context template used to verify the default CLI target: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/files/nats-box/contexts-secret/context.yaml
- Official NATS CLI repository: https://github.com/nats-io/natscli
- Official NATS CLI stream command source used to verify `--defaults`: https://github.com/nats-io/natscli/blob/main/cli/stream_command.go

## Issues Found
- The Helm values example used outdated chart keys (`cluster`, `nats.jetstream.fileStorage`, `nats.resources`, and `exporter`) that do not match the current official NATS Helm chart schema. I updated the example to the current `config.*`, `container.resources`, and `promExporter` structure.
- The verification step claimed to check cluster status, but `nats-server --version` only reports the binary version. I replaced it with `kubectl rollout status statefulset/nats -n messaging`, which actually verifies the workload is ready.
- The publish/subscribe test used the NATS server pod as if it contained the NATS CLI. The official chart installs `nats-box` by default for CLI validation, so I changed the examples to use `deployment/nats-box`.
- The JetStream stream example omitted `--defaults`, which means the command can still prompt interactively for missing values. I added `--defaults` so the example works as a non-interactive copy/paste command.
- The phrase "durable stream" was imprecise. In NATS, durability terminology is primarily used for consumers, so I changed it to "Create a stream."
- The conclusion claimed "under 100MB memory for a basic cluster" and said the Prometheus exporter works "without additional configuration." Those statements were too strong for the demonstrated setup, so I replaced them with accurate wording.

## Review Notes
- Helm was not installed in the review environment, so chart validation was done against the official NATS Helm chart repository, including the published `values.yaml`, README, and templates.
- The application connection URL `nats://nats.messaging.svc.cluster.local:4222` is correct for this post because the install command uses the Helm release name `nats`, which matches the chart's default service naming behavior.
