# Validation Summary: How to Troubleshoot Whisker in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Goldmane flow logs API
- FelixConfiguration
- Kubernetes
- kubectl

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Open Source FelixConfiguration CRD schema in official manifests: https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/operator-crds.yaml
- Tigera operator Whisker render package documentation: https://pkg.go.dev/github.com/tigera/operator/pkg/render/whisker
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described the pipeline as Felix flow logs going directly to a Whisker backend. Official Calico documentation states that Goldmane aggregates flow logs and exposes the flow logs API that powers Whisker. I updated the introduction and architecture diagram to include Goldmane.
- The verification command only checked for Whisker pods. Since Whisker does not work without Goldmane, I changed the command to check both `whisker` and `goldmane`.
- The log command used `-l app=whisker`, but the operator-rendered component names are documented as `deployment/whisker` and `deployment/goldmane`. I changed the examples to use those deployment resources and include all containers.
- The port-forward command used the `svc` shorthand. That works in kubectl, but the official Calico documentation uses `service/whisker`, so I aligned the command with the documented form.
- The query examples used non-documented field names and title-cased action values. Official Whisker flow log data types use fields such as `source_name`, `dest_name`, `source_namespace`, `start_time`, and lowercase `allow` / `deny` actions. I updated the examples accordingly.
- The conclusion implied every denied traffic entry is a direct traffic event. Official Calico documentation describes flow logs as aggregated connection data, so I changed the wording to "denied flow view."

## Review Notes
Calico Whisker and Goldmane are documented as tech preview in current Calico Open Source documentation. New operator and Helm installations of Calico Open Source 3.30 and later enable them by default, while clusters upgraded from 3.29 or earlier need manual enablement.
