# Validation Summary: How to Create Incident Response Runbooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Services and EndpointSlices
- Kubernetes NetworkPolicy
- Kubernetes Pod Disruption Budgets
- CoreDNS
- Google Kubernetes Engine gcloud CLI
- AWS CLI for EC2 Auto Scaling
- jq
- curl and BusyBox debugging commands

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes resource requests and CPU units documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Services documentation, including Endpoints deprecation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes disruptions and Pod Disruption Budgets documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Google Cloud SDK `gcloud container clusters resize` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/resize
- AWS CLI `autoscaling set-desired-capacity` reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/set-desired-capacity.html

## Issues Found
- Nested Markdown code fences were invalid in several examples. I changed the outer Markdown examples to four-backtick fences and corrected inner Bash fence endings so the snippets render as intended.
- The CPU request sorting command sorted the literal `CPU:` label field rather than the CPU request value, and it did not normalize Kubernetes CPU units. I replaced it with a `jq` pipeline that converts CPU requests to millicores before sorting.
- The pod scheduling runbook described Pod Disruption Budgets as a scheduling failure cause. PDBs constrain voluntary disruptions such as evictions during drains, not normal pod scheduling. I reworded this as a related drain or rollout check and updated the resolution heading.
- The service discovery runbook used the deprecated Endpoints API. I updated the command and wording to use EndpointSlices, which Kubernetes now recommends for service endpoint inspection.
- The dependency connectivity check used HTTP `wget` against a database port, which is not a valid generic TCP dependency test. I changed it to `nc -vz database 5432`.
- The network policy mitigation included a namespace label command that did not affect the temporary allow-all policy. I removed that command so the snippet only contains the policy that changes traffic behavior.
- The post ended with an empty Bash code block. I removed it because it was not a valid or useful technical example.

## Review Notes
Most kubectl commands are intentionally generic and use placeholders, so they still require responders to substitute the correct namespace, pod, deployment, service, and port values. `kubectl top` also depends on Metrics Server or another metrics API provider being available in the cluster.
