# Validation Summary: How to Validate Calico on OpenShift Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- OpenShift Container Platform
- Kubernetes
- Tigera Operator
- Security Context Constraints
- MachineConfigPools
- Bash
- kubectl and oc CLI commands

## Sources Consulted
- Calico OpenShift installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico operator installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Red Hat OpenShift Security Context Constraints documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift MachineConfigPool status documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/machine_configuration/index
- Red Hat OpenShift cluster operator health documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/backup_and_restore/graceful-restart-cluster
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The original Calico pod check counted pods whose status was not exactly `Running`, which can miss readiness failures inside running pods. Changed it to `kubectl wait --for=condition=Ready pods --all -n calico-system --timeout=120s` so the validation checks the Kubernetes Ready condition.
- The SCC check claimed the `calico-node` SCC was correct but only checked that the SCC object existed. Changed it to also verify that `calico-node` pods are admitted with the `openshift.io/scc` annotation set to `calico-node`.
- The DNS connectivity check used `oc run` without attaching to the container, so success only proved that the pod was created, not that `nslookup` succeeded. Changed it to use `--rm -i --attach --command -- nslookup ...` so the command exit status drives the check.

## Review Notes
- The post is accurate as a focused post-upgrade validation guide after the corrections above.
- The cluster operator and network operator checks are warnings in the script even though the conclusion describes a binary pass/fail result. That is a reasonable operational choice for post-upgrade diagnostics, but a stricter future version could count those warnings as failures.
