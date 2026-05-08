# Validation Summary: Validating the Resolution of FailedCreatePodSandBox Errors After Installing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico CNI
- Calico IPPool and IPAM
- Kubernetes Pods, DaemonSets, Events, taints, tolerations, and node debugging
- Bash and Python command snippets

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes node assignment documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes deprecated API migration guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The all-node validation script described its node list as schedulable but only selected node names and filtered the string `NotReady`, which could not work because node status was not included. I changed it to use the supported Node field selector `spec.unschedulable!=true` and an `awk` check for Ready nodes.
- The Felix readiness command used `calico-node` without the path shown in Calico's readiness documentation. I changed it to `/bin/calico-node -felix-ready`.
- The IPPool comment implied `vxlanMode` and `disabled` should not be set at all. Calico documents `disabled` as a boolean and `vxlanMode` as a valid field, so I clarified that `disabled` should be false and `vxlanMode` should be Never or omitted when IPIP is intended.
- The canary DaemonSet command exited after one hour, which would cause normal container restarts instead of sustained healthy execution. I changed it to an infinite loop that emits the heartbeat once per hour.
- The events verification command sent kubectl JSONPath output to Python's JSON parser even though kubectl JSONPath output is not guaranteed to be JSON. I changed it to `-o json` and updated the parser to handle current and compatibility Event timestamp fields.
- The final node readiness command always printed the `kubectl get nodes` header. I changed it to print only non-Ready nodes.

## Review Notes
The examples assume the operator namespace `calico-system`; Calico documentation notes that manifest-based installs commonly use `kube-system` instead. The post is still technically correct for operator-based installs, but readers may need to adjust the namespace for their deployment.
