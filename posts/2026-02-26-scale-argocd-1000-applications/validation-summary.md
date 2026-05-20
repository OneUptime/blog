# Validation Summary: How to Scale ArgoCD for 1000+ Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Redis HA
- Prometheus metrics and alerting
- Controller sharding

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD declarative setup and resource exclusions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD FAQ on repository polling and reconciliation interval: https://argo-cd.readthedocs.io/en/latest/faq/

## Issues Found
- Controller sharding was described as directly splitting applications evenly across controller replicas. Argo CD sharding distributes destination clusters across controller shards, so I updated the sharding explanation, sizing table, architecture diagram, and conclusion to clarify that application distribution depends on destination cluster assignment.
- The repo server example used `--parallelism-limit`, but the current repo server flag is `--parallelismlimit`. I corrected the flag.
- The repo server example used `--git-shallow-clone`, which is not a current repo server flag. I removed it and added the supported shallow clone approach: repository `depth: "1"` or `argocd repo add <repo-url> --depth`.
- The reconciliation example used `timeout.hard.reconciliation`, which is not documented in the current Argo CD ConfigMap examples. I replaced it with the documented `timeout.reconciliation.jitter` setting.
- The ignore differences example used `managedFields` with `manager`; Argo CD expects `managedFieldsManagers`. I corrected the configuration key.
- The shard balance alert used a non-existent `controller` label on `argocd_app_info`. I changed the alert to use the documented `dest_server` label to detect uneven application distribution across destination clusters.

## Review Notes
The sizing recommendations remain workload-dependent. The post now avoids implying that controller replica count alone splits applications in a single-cluster deployment; users should validate the actual bottleneck with Argo CD metrics before scaling shards.
