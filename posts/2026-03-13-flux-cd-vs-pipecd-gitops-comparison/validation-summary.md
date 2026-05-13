# Validation Summary: Flux CD vs PipeCD: GitOps Comparison

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Flux CD
- PipeCD
- GitOps
- Kubernetes
- Terraform
- Cloud Run
- AWS Lambda
- Amazon ECS
- Flagger
- SOPS
- OCI artifacts

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux webhook receiver documentation: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Flagger project documentation: https://github.com/fluxcd/flagger
- PipeCD project site: https://pipecd.dev/
- PipeCD concepts and quickstart documentation: https://pipecd.dev/docs/concepts/ and https://pipecd.dev/docs/quickstart/
- PipeCD adding an application documentation: https://pipecd.dev/docs-v0.50.x/user-guide/managing-application/adding-an-application/
- PipeCD platform provider documentation: https://pipecd.dev/docs-v0.53.x/user-guide/managing-piped/adding-a-platform-provider/
- PipeCD Kubernetes app configuration documentation: https://pipecd.dev/docs-dev/user-guide/managing-application/defining-app-configuration/kubernetes/
- PipeCD Terraform app configuration documentation: https://pipecd.dev/docs-v0.46.x/user-guide/managing-application/defining-app-configuration/terraform/
- PipeCD configuration reference: https://pipecd.dev/docs-v0.52.x/user-guide/configuration-reference/
- PipeCD manual approval documentation: https://pipecd.dev/docs-v0.52.x/user-guide/managing-application/customizing-deployment/adding-a-manual-approval/
- PipeCD Kubernetes canary examples: https://pipecd.dev/docs-v0.52.x/user-guide/examples/k8s-app-canary-with-istio/ and https://pipecd.dev/docs-v0.53.x/user-guide/examples/k8s-app-canary-with-pod-selector/
- CNCF PipeCD project page: https://www.cncf.io/projects/pipecd/
- Flux CNCF graduation announcement: https://fluxcd.io/blog/2022/11/flux-is-a-cncf-graduated-project/

## Issues Found
- PipeCD application filename was listed as `.pipe.yaml`, but PipeCD documentation uses `app.pipecd.yaml` by default and scans files suffixed with `.pipecd.yaml`. Updated the text and snippet comment.
- PipeCD canary snippet described `replicas: 10%` as traffic. PipeCD treats this as canary workload replicas relative to primary replicas. Updated the comment.
- PipeCD weighted traffic-routing snippet used `K8S_TRAFFIC_ROUTING` without showing the required traffic routing configuration for the weighted Istio-style example. Added a `trafficRouting` block and a final `primary: 100` routing stage to match PipeCD's documented canary pattern.
- The comparison table described Flux manual approvals as "via Jobs". Flux does not provide a native manual approval gate comparable to PipeCD's `WAIT_APPROVAL`. Changed this to "No native gate".
- PipeCD Terraform snippet used `input.workingDir`, which is not a documented `TerraformDeploymentInput` field. Removed the invalid field.

## Review Notes
Flux can be made more responsive with webhook receivers, but the controllers still pull and reconcile source changes. PipeCD documentation exists across versioned pages; the reviewed examples align with the documented v0.52/v0.53 application configuration model and current project-level concepts.
