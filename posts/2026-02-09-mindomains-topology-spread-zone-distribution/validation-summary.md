# Validation Summary: How to Use minDomains in Topology Spread Constraints for Even Zone Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Pod topology spread constraints
- Deployments
- StatefulSets
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: Pod v1 topologySpreadConstraints - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes removed feature gates reference: MinDomainsInPodTopologySpread - https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes blog: fine-grained pod topology spread policies reached beta - https://kubernetes.io/blog/2023/04/17/fine-grained-pod-topology-spread-features-beta/

## Issues Found
- The post incorrectly stated that topology spread constraints only spread across domains that already have matching pods. Updated the explanation to use Kubernetes' documented eligible-domain and global-minimum behavior.
- The post incorrectly described minDomains as forcing the first pods into different domains when enough domains already exist. Updated the examples to explain that maxSkew already balances across eligible domains, and minDomains affects skew calculation when fewer eligible domains exist than requested.
- The post stated minDomains became stable in Kubernetes 1.26. Corrected this to Kubernetes 1.30, with the feature gate history noted for versions before 1.30.
- Several examples used `minDomains` with `whenUnsatisfiable: ScheduleAnyway`, which Kubernetes does not allow. Updated those snippets to use `DoNotSchedule` or to omit `minDomains` when demonstrating `ScheduleAnyway`.
- The multi-level topology explanation implied per-region zone spreading. Corrected it to say both constraints apply to the same pod set across eligible regions and eligible zones overall.
- The monitoring command used `.spec.nodeSelector` as a pod zone, which does not report the node's zone label. Replaced it with commands that look up the scheduled node's `topology.kubernetes.io/zone` label.
- The node-zone troubleshooting command assumed the zone column was always `$6`. Replaced it with `$NF` after skipping the header.
- The cluster-size snippets omitted the required `whenUnsatisfiable` field. Added `whenUnsatisfiable: DoNotSchedule` to those examples.

## Review Notes
The corrected article is accurate for current Kubernetes behavior. `matchLabelKeys` remains version-sensitive: it is beta and enabled by default from Kubernetes 1.27, with selector-merge behavior changing in Kubernetes 1.34.
