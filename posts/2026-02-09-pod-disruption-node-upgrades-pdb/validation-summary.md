# Validation Summary: How to Handle Pod Disruption During Node Upgrades with PodDisruptionBudget

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PodDisruptionBudget
- Kubernetes Eviction API
- kubectl drain
- jq-based Kubernetes JSON inspection
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes documentation: API-initiated Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction
- Kubernetes generated kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors

## Issues Found
- The PDB test script used `kubectl delete pod`, which bypasses PDB admission because PDBs are enforced for API-initiated evictions, such as the Eviction API and `kubectl drain`. Changed the example to create a `policy/v1` `Eviction` object with `kubectl create -f -`.
- The monitoring script used `--field-selector status.phase=Terminating`, but `Terminating` is not a Pod phase field value. Changed the example to query pods as JSON and filter for a non-null `.metadata.deletionTimestamp`.
- The drain-analysis script read labels with `jsonpath` and then piped the result to `jq`, but `kubectl` JSONPath map output is not valid JSON. Changed it to read the pod as JSON and extract `.metadata.labels` with `jq`.
- The drain-analysis script compared label selectors with a string `contains()` check, which could miss valid matches or match incorrectly. Changed it to verify that every PDB `matchLabels` entry is present with the same value on the pod labels.
- The automated PDB creation and PDB coverage scripts read Deployment selectors with `jsonpath` and then attempted `jq fromjson`, which would fail because the output is not JSON. Changed these snippets to extract `.spec.selector.matchLabels` from `kubectl -o json`.
- The automated PDB creation and coverage scripts only detected exact selector matches. Changed them to detect PDB `matchLabels` selectors that are a subset of the Deployment selector, avoiding false negatives for broader PDB selectors.

## Review Notes
The examples use the stable `policy/v1` PodDisruptionBudget API, which is current for Kubernetes v1.21 and later. The selector-matching scripts focus on `matchLabels`; future improvements could evaluate `matchExpressions` as well for complete Kubernetes label selector coverage.
