# Validation Summary: How to Troubleshoot Logging Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Logging
- Kubernetes
- `kubectl`
- Fluent Bit
- Fluentd
- Logging Operator

## Sources Consulted
- SUSE Rancher Manager: Logging Architecture - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging-architecture.html
- Rancher docs: Outputs and ClusterOutputs - https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Rancher chart `rancher-logging` `Chart.yaml` - https://github.com/rancher/charts/blob/release-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/Chart.yaml
- Rancher chart `rancher-logging` `values.yaml` - https://github.com/rancher/charts/blob/release-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/values.yaml
- Rancher chart `templates/logging/logging.yaml` - https://github.com/rancher/charts/blob/release-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/templates/logging/logging.yaml
- Rancher chart `templates/logging/fluentbit.yaml` - https://github.com/rancher/charts/blob/release-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/templates/logging/fluentbit.yaml
- Logging Operator: Troubleshooting - https://kube-logging.dev/docs/operation/troubleshooting/
- Logging Operator: Troubleshooting Fluentd - https://kube-logging.dev/docs/operation/troubleshooting/fluentd/
- Logging Operator: Troubleshooting Fluent Bit - https://kube-logging.dev/5.1/docs/operation/troubleshooting/fluentbit/
- Logging Operator: Buffer output configuration - https://kube-logging.dev/docs/configuration/plugins/outputs/buffer/
- Logging Operator Fluentd image Dockerfile - https://github.com/kube-logging/logging-operator/blob/master/images/fluentd/Dockerfile
- Kubernetes: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl rollout restart` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Ruby standard library: `TCPSocket` - https://docs.ruby-lang.org/en/master/TCPSocket.html
- Ruby standard library: `Net::HTTP` - https://docs.ruby-lang.org/en/master/Net/HTTP.html
- Ruby OpenSSL: `OpenSSL::SSL::SSLSocket` - https://ruby-doc.org/3.4/exts/openssl/OpenSSL/SSL/SSLSocket.html

## Issues Found
- The post described Rancher-managed Fluentd as `StatefulSet/Deployment`. Current Rancher Logging and Logging Operator documentation describe Fluentd as a StatefulSet, so this was corrected.
- The Fluent Bit and Fluentd configuration inspection commands read files directly from pod paths. Logging Operator documents these configurations via generated Secrets, so the commands were updated to use the documented secret-based retrieval pattern.
- The Fluentd buffer size command used `kubectl exec ... -- du -sh /buffers/*`. Globs are not expanded without a shell in `kubectl exec`, so the command was corrected to run through `sh -c`.
- The destination connectivity section relied on `curl`, `nslookup`, and the `openssl` CLI inside the Fluentd container. The default Logging Operator Fluentd image does not ship those tools, so the checks were rewritten as Ruby one-liners that use libraries present in the image to test HTTP auth, DNS resolution, and TLS certificate inspection.
- The secret verification command attempted to decode the entire `.data` map from a Kubernetes Secret, which is not valid. It was corrected to decode a specific key from the secret.
- The rollout restart commands used a non-canonical argument form. They were corrected to the documented `TYPE/NAME` syntax.
- The buffer tuning snippet set `retry_max_interval` to a bare integer even though the Logging Operator buffer schema expects a duration string. It was corrected to `30s`.

## Review Notes
- The post assumes the default Rancher Logging release name `rancher-logging` in the `cattle-logging-system` namespace. If the app was installed with a different release name, the generated Secret and workload names will differ.
- `kubectl top` requires Metrics Server to be installed in the target cluster.
- Current Rancher v2.13 charts package Logging Operator 4.10.0; older `v2.6+` installations may differ slightly in generated resource names and image contents, but the corrected commands align with current Rancher and Logging Operator documentation.
