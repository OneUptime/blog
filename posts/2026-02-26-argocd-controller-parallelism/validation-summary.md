# Validation Summary: How to Configure Controller Parallelism in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Argo CD repo-server
- Argo CD controller sharding
- Kubernetes ConfigMaps, Deployments, StatefulSets, and Services
- kubectl
- Prometheus metrics and alert rules

## Sources Consulted
- Argo CD High Availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD CLI `argocd app list` reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_app_list/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl command reference, including `kubectl top pod`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- AWS Open Source Blog on Argo CD application controller scalability and queue metrics: https://aws.amazon.com/blogs/opensource/argo-cd-application-controller-scalability-testing-on-amazon-eks/

## Issues Found
- The status processor heuristic said `Total applications / 10`, which conflicted with the article's own table and with Argo CD's documented example of 50 status processors for 1000 applications. Changed it to `Total applications / 20`.
- The application-count table said 1000+ applications "must use sharding." Argo CD documents sharding for distributing managed clusters and reducing controller memory pressure, not as a mandatory threshold based only on application count. Updated the table notes accordingly.
- The sharding section incorrectly described sharding as distributing applications by a hash of the application name. Argo CD shards managed clusters across controller replicas, and applications are processed by the shard that owns their destination cluster. Updated the heading, explanation, and Mermaid diagram.
- The sharding algorithm example omitted the current `consistent-hashing` option and described `legacy` as hash-based. Updated the option list and described `legacy` as a non-uniform UID-based distribution.
- The repo-server section used an inaccurate cache-hit-rate formula for maximum repo-server requests and had comments implying the repo-server must handle 40 concurrent requests while setting `reposerver.parallelism.limit` to 15. Replaced the formula and comments with wording that matches the documented repo-server manifest generation concurrency limit.
- The key takeaway said to use controller sharding for 500+ applications. Updated it to say sharding distributes clusters across controller replicas when controller memory is high.

## Review Notes
- The `round-robin` and `consistent-hashing` sharding algorithms are documented by Argo CD as experimental alpha features. The post's example is technically valid, but future revisions could mention that caveat.
