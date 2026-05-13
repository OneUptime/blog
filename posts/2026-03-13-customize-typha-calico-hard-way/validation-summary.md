# Validation Summary: How to Customize Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Typha
- FelixConfiguration
- calicoctl
- kubectl
- Kubernetes Deployments, Services, PriorityClasses, PodDisruptionBudgets, and topology spread constraints

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico hard way Typha installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The Typha listening port command used `TYPHA_PORT`, but the official Typha configuration parameter is `ServerPort` with environment variable `TYPHA_SERVERPORT`. Updated the command to use `TYPHA_SERVERPORT=5474`.
- The post used the `calico-system` namespace throughout, but the Calico hard way Typha manifest installs Typha in `kube-system`. Updated the commands and PDB namespace to `kube-system`.
- The FelixConfiguration patch used incorrectly cased field names. Updated them to `typhaK8sServiceName` and `typhaK8sNamespace`, matching Calico resource field naming.
- The logging section claimed Typha supports JSON logging directly. The official Typha configuration exposes log destination and severity settings, not a JSON log format option. Reworded the section to describe log routing and external transformation for JSON output.
- The health probe patch omitted `host: localhost`, while the Calico hard way Typha manifest uses localhost for the health endpoint because Typha's health host defaults to localhost. Added `host: "localhost"` to the liveness and readiness probes.
- The topology spread constraint selected `app: calico-typha`, but the hard way Typha pods are labeled `k8s-app: calico-typha`. Updated the selector so it matches the Typha pod template labels.

## Review Notes
The PriorityClass, PodDisruptionBudget, nodeSelector, and topology spread constraint APIs are current. The PDB protects against voluntary disruptions during maintenance, but it does not guarantee availability during involuntary failures or if Typha has only one replica.
