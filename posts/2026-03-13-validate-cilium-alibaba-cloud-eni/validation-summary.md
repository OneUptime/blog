# Validation Summary: Validate Cilium on Alibaba Cloud ENI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Alibaba Cloud ECS
- Alibaba Cloud ENI
- Alibaba Cloud ACK
- Cilium IPAM
- Cilium CLI
- kubectl

## Sources Consulted
- Cilium Alibaba Cloud ENI installation documentation: https://docs.cilium.io/en/latest/installation/alibabacloud-eni/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-operator-alibabacloud` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator-alibabacloud/
- Cilium `cilium-agent` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CiliumNode API reference: https://pkg.go.dev/github.com/cilium/cilium/pkg/k8s/apis/cilium.io/v2
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Alibaba Cloud ECS ENI overview: https://www.alibabacloud.com/help/en/ecs/user-guide/eni-overview

## Issues Found
- The prerequisites and expected ConfigMap output used `ipam: eni`, which is the AWS ENI IPAM mode. Cilium's Alibaba Cloud ENI integration is installed with `ipam.mode=alibabacloud`, so I changed those references to `ipam: alibabacloud` and expected output `alibabacloud`.
- The CiliumNode examples inspected `.status.eni`, which is the AWS ENI status field. Alibaba Cloud ENI status is exposed at `.status.alibaba-cloud`, so I updated the grep and JSON inspection command accordingly.
- The operator log selector used `name=cilium-operator`, which is not the documented default operator selector. I changed it to `io.cilium/app=operator`, matching the Cilium CLI/operator selector defaults.
- The CiliumEndpoint readiness check used `grep -v "ready"`, which prints the header even when all endpoints are ready and can produce confusing output. I changed it to a JSONPath filter that prints only endpoints whose `.status.state` is not `ready`.
- The best-practice note referenced `--eni-tags`, which is primarily documented for the generic/AWS ENI operator flow and was not the right Alibaba Cloud guidance. I replaced it with a note about Alibaba Cloud vSwitch and security group tag filters.

## Review Notes
- The guide remains a validation checklist rather than a complete installation guide. Readers still need a correctly installed Cilium Alibaba Cloud deployment, including the required Alibaba Cloud credentials and permissions.
- The DNS test pod deletion command is technically valid, but in future revisions it could add `--ignore-not-found` or a `trap` pattern for cleanup after failed DNS tests.
