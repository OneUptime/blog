# Validation Summary: How to Configure IPv6 Service ClusterIPs in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- Service `ipFamilyPolicy`, `ipFamilies`, `clusterIP`, and `clusterIPs`
- Headless Services
- Kubernetes DNS / CoreDNS A and AAAA records
- kubectl JSONPath output

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service documentation, including ClusterIP, headless Services, and DNS behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The `kubectl get svc ... -o jsonpath='{.spec.clusterIPs}'` examples implied JSON array output. Updated them to use explicit JSONPath `range` expressions and show one ClusterIP per line.
- The `kubectl get svc ... -o jsonpath='{.spec.ipFamilies}'` example implied JSON array output. Updated it to use an explicit JSONPath `range` expression and show `IPv6` as the expected value.
- The `SingleStack` explanation implied `ipFamilies[0]` is always present. Reworded it to state that Kubernetes uses `ipFamilies[0]` if set, otherwise the first configured service cluster IP range.

## Review Notes
`kubectl` was not installed locally, so CLI syntax was checked against official Kubernetes kubectl reference documentation instead of local `--help` output. The remaining Service manifests use the current `v1` Service API and match Kubernetes dual-stack documentation. The access examples assume matching backend Pods already exist for the Service selectors.
