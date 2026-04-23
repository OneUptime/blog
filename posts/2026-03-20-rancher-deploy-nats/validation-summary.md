# Validation Summary: How to Deploy NATS on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- NATS Server
- JetStream
- NATS CLI
- NSC

## Sources Consulted
- NATS Helm chart README: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/README.md
- NATS Helm chart values: https://raw.githubusercontent.com/nats-io/k8s/main/helm/charts/nats/values.yaml
- NATS CLI docs: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS Admin CLI docs: https://docs.nats.io/running-a-nats-service/configuration/resource_management/configuration_mgmt/nats-admin-cli
- NATS JetStream streams admin docs: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/streams
- NATS JetStream consumers admin docs: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/consumers
- NSC basics: https://docs.nats.io/using-nats/nats-tools/nsc/basics
- NATS JWT resolver docs: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt/resolver
- NATS monitoring docs: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS monitoring configuration docs: https://docs.nats.io/running-a-nats-service/configuration/monitoring
- NATS leaf node configuration docs: https://docs.nats.io/running-a-nats-service/configuration/leafnodes/leafnode_conf

## Issues Found
- The Helm values block used unsupported chart keys such as `config.auth`, `config.tls`, `natsbox`, and direct `podMonitor.namespace` and `podMonitor.labels`. I replaced them with the current NATS Helm chart schema, including `natsBox`, `service.ports.monitor.enabled`, and `promExporter.podMonitor.merge`.
- The deployment verification selector matched both NATS server pods and the `nats-box` pod. I narrowed it to the chart's `app.kubernetes.io/component=nats` selector so the verification step only targets the NATS StatefulSet.
- The JetStream CLI section used incorrect or undocumented command forms: `nats stream create`, `nats consumer create`, `nats stream add --defaults`, and `--wait` as a consumer Ack Wait setting. I changed them to the documented `add` commands and non-interactive flags supported by the current CLI.
- The application manifest was not a valid Kubernetes `Deployment` because it omitted `spec.selector` and the pod template labels. I added the required fields and made the JWT credential mount explicitly conditional on a JWT-enabled server configuration.
- The NSC commands used flag forms that are not the documented account-creation style and implied that generating credentials alone enabled server-side JWT auth. I switched to documented NSC command forms and clarified that the step is optional preparation for a JWT-enabled deployment.
- The leaf node example did not match the Helm chart structure, used the wrong URL scheme, and relied on a cluster-local DNS name that would not normally resolve across clusters. I moved `remotes` under `config.leafnodes.merge`, changed the URL to `nats-leaf://`, used a reachable example hostname, and added secret volume patches for the creds file.
- The troubleshooting section used `nats server report routes`, which is not the documented route command in the current CLI docs. I replaced it with `nats server request routes`.
- The introduction and conclusion used imprecise terminology for JetStream by referring to "consumer groups" and "guaranteed delivery". I updated that wording to align with documented NATS and JetStream terminology.

## Review Notes
- The base deployment path now reflects the current NATS Helm chart schema and CLI command surface from the official sources reviewed.
- Rancher does not materially change the NATS deployment mechanics in this post; it mainly provides the Kubernetes management layer for the target cluster.
- The post now keeps JWT-based application credentials explicitly optional. A future expansion could add a full Helm values example for enabling JWT resolver-based auth end to end.
