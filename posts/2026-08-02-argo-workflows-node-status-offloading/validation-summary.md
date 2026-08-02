# Validation Summary: Fixing “Request Entity Too Large” in Argo Workflows with Node-Status Offloading

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Argo Workflows 4.1
- Kubernetes custom resources and `kubectl`
- Argo Workflow Controller and Argo Server
- Node-status compression and SQL offloading
- PostgreSQL, MySQL, and MariaDB
- etcd
- Ingress and reverse proxies
- Helm, Kustomize, and GitOps
- `jq` and shell commands

## Sources Consulted

- [Argo Workflows: Offloading Large Workflows](https://argo-workflows.readthedocs.io/en/latest/offloading-large-workflows/)
- [Argo Workflows: Workflow Controller ConfigMap](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows: WorkflowStatus field reference](https://argo-workflows.readthedocs.io/en/latest/fields/#workflowstatus)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Environment Variables](https://argo-workflows.readthedocs.io/en/latest/environment-variables/)
- [Argo Workflows CLI: `argo`](https://argo-workflows.readthedocs.io/en/latest/cli/argo/)
- [Argo Workflows CLI: `argo lint`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_lint/)
- [Argo Workflows CLI: `argo submit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/)
- [Argo Workflows: Scaling](https://argo-workflows.readthedocs.io/en/latest/scaling/)
- [Argo Workflows: Workflow Templates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows: Workflow of Workflows](https://argo-workflows.readthedocs.io/en/latest/workflow-of-workflows/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Key-Only Artifacts](https://argo-workflows.readthedocs.io/en/latest/key-only-artifacts/)
- [Argo Workflows source: workflow hydrator](https://github.com/argoproj/argo-workflows/blob/main/workflow/hydrator/hydrator.go)
- [Argo Workflows source: Argo Server persistence setup](https://github.com/argoproj/argo-workflows/blob/main/server/apiserver/argoserver.go)
- [Argo Workflows source: controller persistence setup](https://github.com/argoproj/argo-workflows/blob/main/workflow/controller/config.go)
- [Kubernetes: Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)

## Issues Found

- The shell assignment `WF=<workflow-name>` used angle brackets that shell parsers interpret as redirection operators. It was replaced with a syntactically valid placeholder value.
- `.status.offloadNodeStatusVersion` was described as a hash identifying the database version. It is a hash of the offloaded node data used to identify the stored node-status version. The explanation was corrected accordingly.
- The test guidance said only to cross the compression threshold, which can result in compressed in-object status without exercising SQL offloading. It now requires status that remains over the workflow-size ceiling after compression.
- The verification guidance said `argo get` could reconstruct offloaded status without naming its required connection mode. The Argo CLI defaults to direct Kubernetes API mode, which does not support large offloaded Workflows. The guidance now requires Argo Server mode.
- The `ARGO_SERVER` example omitted a port even though the CLI documents the value as `host:port`. The example now uses `argo.example.com:443` with TLS enabled.
- The ConfigMap troubleshooting section referred to a rendered controller configuration log. The current controller logs configuration status messages rather than the rendered configuration. The wording was corrected to direct readers to those status messages.

## Review Notes

- The Argo Workflows 4.1 compression-algorithm version statement, supported algorithms, and downgrade warning are current and accurate.
- Node-status offloading is correctly distinguished from Workflow Archive persistence, oversized Workflow specs, and ingress-generated HTTP 413 responses.
- The persistence ConfigMap structure, database field names, Secret namespace, migration behavior, SQL backend support, and demand-driven offloading behavior match the current official configuration and source.
- Deployment and Service names, Argo Server authentication, ingress protocol, TLS, and database TLS settings remain installation-specific and should be adapted to the deployed chart and environment.
