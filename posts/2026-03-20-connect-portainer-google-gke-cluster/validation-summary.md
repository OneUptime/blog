# Validation Summary: How to Connect Portainer to a Google GKE Cluster

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Server, Agent, Edge Agent)
- Portainer REST API (`/api/auth`, `/api/endpoints`)
- Google Kubernetes Engine (GKE)
- Kubernetes (kubectl, manifests, LoadBalancer services)
- Helm (referenced in original draft)
- curl, bash, python3 (used in API examples)

## Sources Consulted
- [Portainer Docs — Add a Kubernetes environment](https://docs.portainer.io/admin/environments/add/kubernetes)
- [Portainer Docs — Install Portainer Agent on Kubernetes](https://docs.portainer.io/admin/environments/add/kubernetes/agent)
- [Portainer Docs — Edge Agent on Kubernetes](https://docs.portainer.io/admin/environments/add/kubernetes/edge)
- [Portainer Helm chart repo (`portainer/k8s`)](https://github.com/portainer/k8s)
- [Portainer Helm chart index — `https://portainer.github.io/k8s/index.yaml`](https://portainer.github.io/k8s/index.yaml)
- [Portainer Helm chart docs — `portainer/portainer`](https://portainer.github.io/k8s/charts/portainer/)
- [Portainer Docs — Google Cloud (GKE) KaaS integration](https://docs.portainer.io/admin/environments/add/kaas/gke)

## Issues Found

1. **Non-existent Helm chart `portainer/portainer-agent`.** The original post instructed readers to run `helm install portainer-agent portainer/portainer-agent ...`. The official Portainer Helm repository (`https://portainer.github.io/k8s/`) only contains a single chart, `portainer` (the server). The `index.yaml` lists 79 versions of one chart and no `portainer-agent`. The Portainer documentation explicitly states that "Helm charts for agent-only deployments will be available soon" — they do not yet exist. The command in the post would fail with a chart-not-found error.

   **Fix:** Replaced the Helm install with the officially documented `kubectl apply -f https://downloads.portainer.io/ce2-21/portainer-agent-k8s-lb.yaml` flow, which is what Portainer's docs and UI generate. Added a brief note about the node-port variant for users who don't want a LoadBalancer.

2. **Mixing Edge Agent settings into a standard agent install.** The original Helm command set `env.serverAddress`, `env.edgeId`, and `env.edgeKey`. Those values are exclusively for the Edge Agent (which uses a tunnel back to the server), not the standard Kubernetes Agent (which the server connects to over port 9001). Even if the Helm chart existed, mixing these would not produce a working environment.

   **Fix:** Removed the Edge-specific variables and described the standard Agent flow (LoadBalancer IP + port 9001 added in the Portainer UI), which matches the post's framing of EKS/AKS/GKE deployments.

3. **Empty placeholder text in Best Practices.** The bullet read: `Apply consistent tags for filtering (e.g., , )` — the example values had been left blank.

   **Fix:** Filled in concrete tag examples (`env:prod`, `region:us-central1`).

## Review Notes

- The API examples (`POST /api/auth` returning a `jwt`, `GET /api/endpoints`) match the current Portainer API. The use of `--insecure` against `https://localhost:9443` is appropriate for the default self-signed cert on a local install but should not be copied into production scripts.
- The post is titled "Google GKE Cluster" but the agent install is generic to any cloud Kubernetes; the GKE-specific note added in the fix (LoadBalancer provisions an external TCP LB on GKE) anchors the instructions to the post's stated scope.
- Agent version should always match the Portainer Server version. The post now mentions this; readers on a different release should swap `ce2-21` for their `ceX-Y` path.
- The opening sentence ("...to a Google GKE Cluster in Portainer is a key management task...") is awkwardly redundant but is a stylistic issue rather than a technical error, so it was left alone per the review scope.
