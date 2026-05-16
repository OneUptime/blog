# Validation Summary: How to Set Up Kubecost on Talos Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Kubecost
- Helm
- AWS IAM, S3, Athena, Glue, and Cost and Usage Reports
- Prometheus Operator ServiceMonitor
- Slack webhooks
- Kubecost Allocation and Savings APIs

## Sources Consulted
- IBM Kubecost 3.x first-time install documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=installupgrade-first-time-user-install
- IBM Kubecost 3.x Helm checks and moved values: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=checks-helm
- Kubecost Helm chart values: https://github.com/kubecost/kubecost/blob/develop/kubecost/values.yaml
- Kubecost chart repository page: https://kubecost.github.io/kubecost/
- IBM Kubecost 3.x Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- IBM Kubecost Container Request Right Sizing API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api-v2
- IBM Kubecost alerts documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=ui-alerts
- IBM Kubecost network cost configuration documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=configuration-network-cost
- IBM Kubecost AWS cloud integration documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=integration-aws-cloud-using-irsaeks-pod-identities
- IBM Kubecost multi-cloud integration documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=integrations-multi-cloud

## Issues Found
- The Helm repository and chart name used the older `cost-analyzer` chart path. Updated examples to use `https://kubecost.github.io/kubecost/` and `kubecost/kubecost`, matching current Kubecost 3.x installation docs.
- The install examples used `kubecostToken` and Prometheus retention values from older chart conventions. Replaced them with `global.clusterId` and optional product key values.
- The production values file used removed Kubecost 3.x values such as `global.prometheus`, `kubecostModel`, `kubecostFrontend`, root `service`, and `grafana`. Updated the snippets to current `finopsagent`, `frontend`, `frontend.service`, `kubecostProductConfigs.clusterProfile`, and `networkCosts` values.
- The AWS billing configuration used older flat `kubecostProductConfigs` keys. Updated it to `cloudCost.cloudIntegrationJSON` with an AWS Athena integration object that matches the current chart values.
- The custom pricing snippet used old `customPricesEnabled` and `defaultModelPricing` keys. Updated it to `finopsagent.agent.kubecost.customPrices`.
- The dashboard port-forward and in-cluster API URL referenced the old `kubecost-cost-analyzer` service. Updated them to the current `kubecost-frontend` service.
- The alert and Slack examples used old `kubecostProductConfigs.alerts` / `alertConfigs` paths. Updated them to `global.notifications.alertConfigs`.
- The custom report used the old request sizing endpoint and response fields. Updated it to `/model/savings/requestSizingV2` and `monthlySavings.cpu` / `monthlySavings.memory`.
- The network cost example used `podMonitor` and a non-chart destination key `cross-zone`. Updated it to `serviceMonitor` and `in-region`, which Kubecost uses for cross-zone classification.
- The free-tier wording conflated Kubecost Free and OpenCost. Clarified the sentence while preserving the original intent.

## Review Notes
Helm was not installed in the local environment, so I could not run `helm template` against the chart. I validated the examples against the official Kubecost documentation and chart values, and checked the edited JSON/YAML snippets parse successfully.
