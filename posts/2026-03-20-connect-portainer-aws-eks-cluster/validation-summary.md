# Validation Summary: How to Connect Portainer to an AWS EKS Cluster

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (CE / agent)
- AWS EKS (Amazon Elastic Kubernetes Service)
- Kubernetes
- Helm (referenced, but corrected — see below)
- kubectl
- Portainer HTTP API (`/api/auth`, `/api/endpoints`)

## Sources Consulted
- Portainer Helm repository index: https://portainer.github.io/k8s/index.yaml
- Portainer Kubernetes charts source: https://github.com/portainer/k8s (only the `portainer` server chart is published; there is no `portainer-agent` chart)
- Official agent manifests on the Portainer downloads CDN:
  - https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml
  - https://downloads.portainer.io/ce-lts/portainer-agent-k8s-nodeport.yaml
  - https://downloads.portainer.io/ce-lts/portainer-agent-edge-k8s.yaml
- Portainer documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent (notes that a Helm-based agent install is not yet available — install is via the Portainer UI wizard / YAML manifests)

## Issues Found
- **Non-existent Helm chart for the Portainer Agent.** The post instructed readers to run `helm install portainer-agent portainer/portainer-agent ...` against `https://portainer.github.io/k8s/`. Verified against the live `index.yaml` for that repo: only the `portainer` (server) chart is published — there is no `portainer-agent` chart, so the command would fail with `Error: chart "portainer-agent" not found`. The `--set env.serverAddress`, `env.edgeId`, and `env.edgeKey` keys also do not exist anywhere in Portainer's published charts. Replaced the Helm block with the officially supported method: `kubectl apply -f` against Portainer's published `portainer-agent-k8s-lb.yaml` / `portainer-agent-k8s-nodeport.yaml` (standard agent) or `portainer-agent-edge-k8s.yaml` (Edge agent), with a note that `EDGE_ID` / `EDGE_KEY` are obtained by creating an Edge environment in the Portainer UI first.

## Review Notes
- The Portainer API snippets (`POST /api/auth` returning a JWT, `GET /api/endpoints`) are correct against current Portainer CE (2.x) — left unchanged.
- The post's title promises an EKS-specific guide, but the body is generic Kubernetes / Portainer-agent content that applies equally to EKS, AKS, and GKE. There is no EKS-specific content (no `aws eks update-kubeconfig`, IAM/OIDC, AWS Load Balancer Controller annotations, etc.). This is a scope/quality concern, not a technical error, so it was left in place per review guidelines.
- The "Best Practices" bullet `Apply consistent tags for filtering (e.g., , )` has empty placeholder values where example tags should appear. This is a content/editorial defect rather than a technical inaccuracy, so it was left as-is.
- Portainer documentation explicitly states "Helm charts for agent-only deployments will be available soon" — readers should monitor the Portainer docs in case a real agent Helm chart is published in a future release.
