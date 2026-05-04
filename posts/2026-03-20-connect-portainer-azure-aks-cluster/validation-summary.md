# Validation Summary: How to Connect Portainer to an Azure AKS Cluster

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Community Edition)
- Azure Kubernetes Service (AKS)
- Kubernetes
- Helm (mentioned but corrected — see Issues Found)
- kubectl
- Portainer HTTP API
- curl / Python (for API examples)

## Sources Consulted
- Portainer Helm chart index: https://portainer.github.io/k8s/index.yaml (only contains the `portainer` server chart, no `portainer-agent` chart)
- Portainer `portainer/k8s` GitHub repo: https://github.com/portainer/k8s/tree/master/charts (only `portainer` chart present)
- Portainer docs — Install Portainer Agent on Kubernetes: https://docs.portainer.io/admin/environments/add/kubernetes/agent.md
- Portainer docs — Edge Agent on Kubernetes: https://docs.portainer.io/admin/environments/add/kubernetes/edge.md
- Portainer docs dynamic query for AKS: https://docs.portainer.io/admin/environments/add/kubernetes/agent.md?ask=...
- Portainer Agent download URLs: https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml, portainer-agent-k8s-nodeport.yaml, portainer-agent-edge-k8s.yaml
- Sibling validated post: posts/2026-03-20-connect-portainer-aws-eks-cluster/README.md (same correction applied there)

## Issues Found

1. **Non-existent Helm chart referenced.** The post instructed users to run `helm install portainer-agent portainer/portainer-agent ...` against the Portainer Helm repo at `https://portainer.github.io/k8s/`. That repository's `index.yaml` only publishes the `portainer` chart (which deploys the Portainer server). There is no `portainer-agent` chart. The official Portainer docs explicitly state: "Helm charts for agent-only deployments will be available soon" and the documented AKS install uses `kubectl apply` with a YAML manifest, not Helm.
   - **Fix:** Replaced the Helm install block with the documented `kubectl apply -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml` (with NodePort variant noted) for the standard agent, and added an Edge Agent variant using `portainer-agent-edge-k8s.yaml`. This matches the corrected sibling post for EKS.

2. **Invalid Helm `--set` values.** Even setting aside the missing chart, the values `env.serverAddress`, `env.edgeId`, `env.edgeKey` do not appear in any official Portainer chart values schema. They were removed as part of the fix above.

3. **Outdated description.** The `Description:` frontmatter line claimed the post used "Helm-based agent deployment". Updated to reference the official YAML manifest deployment to keep description and body consistent.

## Review Notes

- The Portainer API examples (`/api/auth` returning a JSON object with `jwt`, `/api/endpoints` returning environment objects with `Id`, `Name`, `GroupId`, `Tags`) are consistent with the current Portainer 2.x API. The default HTTPS port `9443` is correct.
- The "Best Practices" bullet `Apply consistent tags for filtering (e.g., , )` has empty placeholders where examples should be. This is a content/editorial gap rather than a technical inaccuracy and is also present in the already-validated sibling EKS post, so it was left as-is to stay consistent with sibling-post style. A future copy-edit pass should fill in concrete tag examples (e.g., `env:prod`, `region:eus`).
- The post does not actually contain AKS-specific steps (e.g., obtaining a kubeconfig via `az aks get-credentials`). It applies generic K8s agent install steps. This is a structural/scope observation rather than a technical error.
- The Portainer 2.39 release is current as of the validation date; the `ce-lts` download path used by the corrected manifest URLs tracks the latest CE LTS line and is the path the official docs recommend.
