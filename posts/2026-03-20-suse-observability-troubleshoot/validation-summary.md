# Validation Summary: How to Troubleshoot SUSE Observability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Agent Helm chart
- Kubernetes
- Helm
- Apache Kafka
- Elasticsearch
- ZooKeeper

## Sources Consulted
- SUSE Observability quick troubleshooting guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/troubleshooting.html
- SUSE Observability advanced troubleshooting guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/advanced-troubleshooting.html
- SUSE Observability installation and architecture documentation: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime.html
- SUSE Observability agent air-gapped installation guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime-agent-air-gapped.html
- SUSE Observability agent custom secret management: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/agent/k8s-custom-secrets-setup.html
- SUSE Observability ingress and agent receiver URL documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability release strategy: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/release-notes/Release%20Strategy.html
- SUSE Observability Helm chart templates and values: https://github.com/StackVista/helm-charts/tree/master/stable/suse-observability and https://github.com/StackVista/helm-charts/tree/master/stable/suse-observability-agent
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Apache Kafka basic operations documentation: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Elasticsearch cluster health and cat API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/cat-allocation.html

## Issues Found
- The agent API key command used the wrong secret name and key. Updated it to the Helm-managed `suse-observability-agent-secrets` secret and the `STS_API_KEY` key used by the current chart.
- The agent server URL command referenced a non-existent generic config map. Updated it to read `STS_URL` from `suse-observability-agent-url`.
- The connectivity check used an unsupported `/receiver/solarwinds/health` endpoint. Updated it to curl the configured `STS_URL`, which should point at the SUSE Observability agent receiver endpoint.
- Receiver logs were read from a deployment name that does not match current split receiver deployments. Updated the command to use the `app.kubernetes.io/component-group=receiver` label.
- Kafka pod selection used the obsolete `app=kafka` label. Updated it to `app.kubernetes.io/component=kafka`.
- The topology collector config command referenced the wrong config map. Updated it to inspect `suse-observability-agent-cluster-agent`.
- The post claimed Elasticsearch stores topology and metric data. Updated this to say Elasticsearch stores events and logs; SUSE documents StackGraph for topology and VictoriaMetrics for metrics.
- Elasticsearch pod selection and restart commands used the wrong StatefulSet/pod naming. Updated them to `suse-observability-elasticsearch-master-0` and `statefulset/suse-observability-elasticsearch-master`.
- The restart guidance claimed the order avoids data loss and restarted a non-default `suse-observability-server` deployment. Reworded the claim and updated the final restart command to target current SUSE Observability application deployments by release label.
- The debug log tail command used `grep -v "DEBUG"`, which hides debug lines. Replaced it with a plain `kubectl logs --tail=200 -f` command.
- The best practice about keeping agent and server versions in sync conflicted with SUSE's release strategy. Updated it to recommend the latest supported agent, which SUSE documents as compatible with supported platform versions.

## Review Notes
The local environment did not have `helm` or `kubectl` installed, so CLI syntax was verified against official command references and current SUSE Observability Helm chart templates rather than local `--help` output.

The commands assume the default Helm release names used throughout the post: `suse-observability` for the platform and `suse-observability-agent` for the agent. Deployments using custom release names will need corresponding name substitutions.
