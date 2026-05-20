# Validation Summary: How to Scale the ArgoCD Application Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD application controller
- Argo CD high availability and controller sharding
- Argo CD dynamic cluster distribution
- Kubernetes StatefulSet, Deployment, ConfigMap, Secret, and HorizontalPodAutoscaler resources
- kubectl commands
- Prometheus metrics

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The vertical scaling snippet described patching a Deployment, but the manifest and commands target the `argocd-application-controller` StatefulSet. Updated the comment to say StatefulSet.
- The sharding explanation said shards manage clusters or applications. Argo CD's documented controller sharding is cluster-based, with applications handled according to their destination clusters. Updated the wording.
- The `controller.sharding.algorithm` example comment incorrectly described the key as the number of controller shards. Updated it to identify the key as the sharding algorithm.
- The sharding algorithm options omitted `consistent-hashing`, which is supported in current Argo CD. Added it to the options example.
- The manual cluster shard assignment example used an annotation. Official Argo CD documentation uses the `shard` field in the cluster Secret data. Updated the Secret example to use `stringData.shard`.
- The Kubernetes client tuning keys were incorrect as `controller.k8s.client.config.qps` and `controller.k8s.client.config.burst`. Updated them to `controller.k8s.client.qps` and `controller.k8s.client.burst`.
- The dynamic cluster distribution section said the feature was available in Argo CD 2.8+ and showed a ConfigMap key. Official documentation says it starts in v2.9, is alpha, runs with the controller as a Deployment, and is enabled with `ARGOCD_ENABLE_DYNAMIC_CLUSTER_DISTRIBUTION=true`. Updated the version, caveat, manifest, and HPA target kind.
- The monitoring metrics list included non-official metric names for cluster API actions/resources. Updated the list to documented application controller metrics.
- The metrics command was labeled as checking queue length, but it greps reconciliation metrics. Updated the label to "reconciliation metrics."

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was checked against Kubernetes reference documentation instead of local `kubectl --help` output.
- The resource sizing table is practical guidance rather than an official Argo CD sizing table; exact sizing still depends on application count, resource count, cluster count, manifest generation cost, and API server latency.
