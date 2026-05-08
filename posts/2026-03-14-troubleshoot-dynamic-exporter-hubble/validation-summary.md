# Validation Summary: How to Troubleshoot Dynamic Exporter Configuration in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble exporter
- Kubernetes ConfigMaps
- Helm
- kubectl
- Python / PyYAML

## Sources Consulted
- Cilium Hubble exporter configuration: https://docs.cilium.io/en/latest/observability/hubble/configuration/export/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Helm chart flow log ConfigMap template: https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/cilium/templates/cilium-flowlog-configmap.yaml
- Cilium agent command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent_hive/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes API concepts for resourceVersion: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used a non-default ConfigMap name, `cilium-hubble-export-config`. Cilium's Helm chart defaults dynamic Hubble flow logs to `cilium-flowlog-config`, so I updated the commands accordingly.
- The post treated each ConfigMap data entry as a separate JSON exporter rule. Cilium's chart creates a `flowlogs.yaml` key containing YAML with a top-level `flowLogs` list, so I changed the parsing, extraction, update, and validation examples to work with that structure.
- The post referred to JSON syntax and JSON parse errors. I changed those references to YAML because the dynamic exporter ConfigMap content is YAML.
- The post claimed a Helm `watchInterval` setting with a 10-second default and 1-second minimum. I replaced this with the documented Kubernetes/Cilium behavior that ConfigMap volume propagation can take up to about 60 seconds.
- The expiration scripts compared timestamp strings lexicographically. I changed them to parse timestamps as timezone-aware datetimes before comparing them.
- The cleanup pipeline could call `kubectl apply` with no object when no expired rules existed. I changed it to write to a temporary file and apply only when there is output.
- The verification commands used shell globs directly through `kubectl exec`, where the remote command does not expand them unless a shell is invoked. I changed those examples to run `sh -c` in the Cilium container.
- The resourceVersion comment said changes increment the value. Kubernetes documents resourceVersion as opaque, so I changed the wording to say changes update the opaque value.
- The duplicate-path warning said duplicate exporters can cause corruption. I softened this to interleaved output because the stronger corruption claim was not documented.

## Review Notes
- The examples now require PyYAML for local validation. That dependency is listed in the prerequisites.
- The static exporter path check still uses simple `grep` against Helm values; it is useful for troubleshooting, but operators with heavily customized values may prefer `helm get values --all` or a YAML-aware query tool.
