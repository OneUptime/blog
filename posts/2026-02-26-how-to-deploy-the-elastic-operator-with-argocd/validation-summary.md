# Validation Summary: How to Deploy the Elastic Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Elastic Cloud on Kubernetes (ECK)
- Elasticsearch
- Kibana
- Filebeat / Beats
- Helm

## Sources Consulted
- Elastic ECK install documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install
- Elastic ECK 2.11 Helm chart installation documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-install-helm.html
- Elastic ECK operator configuration documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/configure-eck
- Elastic ECK configuration flags reference: https://www.elastic.co/docs/reference/cloud-on-k8s/eck-configuration-flags
- Elastic ECK 2.11 Elasticsearch node configuration documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-node-configuration.html
- Elastic Elasticsearch node roles documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-settings
- Elastic ECK 2.11 volume claim template documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-volume-claim-templates.html
- Elastic ECK 2.11 Kibana-to-Elasticsearch reference documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-kibana-es.html
- Elastic ECK 2.11 Beats quickstart and Filebeat autodiscover recipe documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-beat-quickstart.html and https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-beat-configuration-examples.html
- Elastic ECK managed credentials documentation: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/managed-credentials-eck
- Elastic ECK 2.11 Elastic Stack upgrade documentation: https://www.elastic.co/guide/en/cloud-on-k8s/2.11/k8s-upgrading-stack.html
- Elastic Stack upgrade documentation: https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD custom health check documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The CRD Argo CD Application set both `ServerSideApply=true` and `Replace=true`. Argo CD documents that `Replace=true` takes precedence over server-side apply and can be destructive, so `Replace=true` was removed to match the post's recommendation to use server-side apply for large CRDs.
- The description referenced Fleet Server deployments, but the tutorial deploys Filebeat, not Fleet Server. The description was corrected to Filebeat.
- The Elasticsearch coordinating node set used `node.roles: ["remote_cluster_client"]`. Elastic documents coordinating-only nodes as nodes with an explicit empty role list, so this was changed to `node.roles: []`.
- The Filebeat manifest used `serviceAccountName: filebeat` and `${NODE_NAME}` but did not create the ServiceAccount/RBAC or define the `NODE_NAME` environment variable. Added the ServiceAccount, ClusterRole, ClusterRoleBinding, `NODE_NAME` fieldRef environment variable, and root container security context matching Elastic's ECK Filebeat autodiscover examples.
- The upgrade guidance said to always upgrade one minor version at a time and not jump from 7.x to 8.x directly. Elastic's documented path requires upgrading to the latest 7.17 patch before moving to 8.x, not stepping through every 8.x minor. The guidance was corrected.
- The Elasticsearch example was described as "production-ready"; the manifest is a useful production-oriented starting point but does not include every production concern such as topology spread, snapshots, or disruption budgets. The wording was changed to "production-oriented."

## Review Notes
The post is technically relevant and includes working implementation details after the corrections above. The examples still assume an AWS `gp3` StorageClass and a cluster policy that permits privileged sysctl init containers and host log access for Filebeat; those are environment-specific operational caveats rather than syntax errors.
