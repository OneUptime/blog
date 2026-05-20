# Validation Summary: How to Deploy ArgoCD Across Multiple Availability Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes topology spread constraints
- Kubernetes pod anti-affinity
- Redis HA and Redis Sentinel
- Kubernetes StorageClass and persistent volumes
- Helm CLI
- kubectl
- jq

## Sources Consulted
- Argo CD Helm chart README and values reference: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Redis HA Helm chart values: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The global topology spread example included a broad `labelSelector` matching `app.kubernetes.io/part-of: argocd`. In the Argo CD Helm chart, component topology spread constraints default the selector when it is omitted; keeping the broad selector would spread all Argo CD components as one combined group instead of spreading each component's replicas. Removed the explicit selector from the global example.
- The Redis HA topology spread examples used Kubernetes list syntax. The current Argo CD chart exposes `redis-ha.topologySpreadConstraints` as an object with `enabled`, `maxSkew`, `topologyKey`, and `whenUnsatisfiable`. Updated the Redis HA snippets to the chart-supported schema.
- The Redis HA HAProxy example included `haproxy.topologySpreadConstraints`, which is not a documented value in the current Redis HA subchart used by the Argo CD chart. Removed that unsupported nested setting while keeping the HAProxy replica count.
- The Redis persistence snippet used `save: ""`, an empty YAML string. The Argo CD chart documents disabled Redis RDB saves as the literal Redis config value `""`, so the YAML was changed to `save: '""'`.
- The AWS EBS CSI StorageClass example used `topology.kubernetes.io/zone` under `allowedTopologies`. Kubernetes' AWS EBS CSI example uses the driver-specific `topology.ebs.csi.aws.com/zone` key, so the snippet was updated.
- The zone distribution verification command used `IFS=' -> '` to parse a string delimiter. Shell `IFS` treats that as a set of individual delimiter characters, which breaks pod names containing hyphens. Changed the command to emit tab-separated fields from `jq` and read them with tab `IFS`.
- The zone failure test said cordoning nodes simulates a zone failure. `kubectl cordon` marks nodes unschedulable but does not evict already running pods. Updated the test to use cordon plus `kubectl drain` in a non-production test cluster.

## Review Notes
- `helm`, `kubectl`, and `argocd` binaries were not available in the local environment, so command behavior was checked against official documentation and chart source rather than local CLI help.
- The post's guidance to disable Redis persistence is consistent with Argo CD's documentation that Redis is a disposable cache, but operators should still consider their own recovery and performance requirements.
