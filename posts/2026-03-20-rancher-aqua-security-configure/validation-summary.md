# Validation Summary: How to Configure Rancher with Aqua Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Aqua Security
- Kubernetes
- Helm
- Aqua Enforcer
- Aqua KubeEnforcer
- Aqua Scanner
- Trivy
- GitHub Actions
- PostgreSQL

## Sources Consulted
- Aqua Security Helm repository index: https://helm.aquasec.com/index.yaml
- Aqua Helm repository overview: https://github.com/aquasecurity/aqua-helm
- Aqua Server Helm chart: https://github.com/aquasecurity/aqua-helm/tree/main/server
- Aqua Enforcer Helm chart: https://github.com/aquasecurity/aqua-helm/tree/main/enforcer
- Aqua Scanner Helm chart: https://github.com/aquasecurity/aqua-helm/tree/main/scanner
- Aqua KubeEnforcer Helm chart: https://github.com/aquasecurity/aqua-helm/tree/main/kube-enforcer
- Aqua deployments repository overview: https://github.com/aquasecurity/deployments
- Aqua Enforcer deployment docs: https://github.com/aquasecurity/deployments/tree/2022.4/enforcers/aqua_enforcer
- Aqua Scanner deployment docs: https://github.com/aquasecurity/deployments/tree/2022.4/scanner
- Aqua KubeEnforcer deployment docs: https://github.com/aquasecurity/deployments/tree/2022.4/enforcers/kube_enforcer
- Aqua Security Trivy GitHub Action: https://github.com/aquasecurity/trivy-action
- Rancher Kubernetes distributions documentation: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/kubernetes-distributions

## Issues Found
- The Helm install example used the wrong repository alias and an invalid chart reference (`aqua/aqua`). I corrected it to the published Aqua repo and `aqua-helm/server`.
- The server values example used incorrect keys for the published chart. I replaced `db.external`, `server.admin`, and `license` with the actual chart structure: `global.db.external`, `admin`, `web`, and `gateway`.
- The post referenced `2024.4` image tags, but Aqua’s public Helm repository currently publishes the `2022.4` chart line for the server, enforcer, scanner, and kube-enforcer charts. I updated the example accordingly.
- The Rancher platform setting required by Aqua’s charts was missing. I added `global.platform=rancher` or `platform=rancher` where the charts require it.
- The enforcer installation command used unsupported or incorrect values (`token`, `gateway.host`, `enforcerMode`). I changed it to the chart’s actual keys: `enforcerToken` and `global.gateway.address` / `global.gateway.port`.
- The enforcer verification snippet showed a partial DaemonSet manifest with the wrong object name and incomplete security settings. I replaced it with `kubectl` verification commands that match the charted deployment.
- The registry integration section relied on unverified `aquactl registry add` and `aquactl scan registry scan` commands. I replaced that with the officially published Scanner chart deployment and kept registry setup as UI-driven guidance.
- The GitHub Actions example incorrectly treated Aqua’s private scanner image as a generic CI scanner invocation. I replaced it with Aqua Security’s official `aquasecurity/trivy-action` workflow pattern for build-time image scanning.
- The Kubernetes Assurance section was incomplete because it never deployed KubeEnforcer, the Aqua component that enforces admission-time assurance policies. I added the official `kube-enforcer` chart deployment and the webhook certificate auto-generation setting.
- The runtime policy, NVD/CVE feed, compliance reporting, and webhook integration API examples were not verifiable against Aqua’s public artifacts and were likely drifted. I replaced them with technically accurate UI-based guidance rather than leaving unsupported API paths in place.
- The prerequisites implied bundled database use as a normal production option. I clarified that external PostgreSQL is the production path and the bundled database is better suited to POCs and testing.

## Review Notes
- Aqua’s public Helm index was still serving the `2022.4` appVersion line when reviewed on April 24, 2026. If the author intended to target a newer private customer release, this post should be revalidated against that specific release’s customer documentation and artifacts.
- Aqua’s public product-doc portal is login-gated for many deployment and API pages, so this review relied on Aqua’s public Helm charts, deployment repository, and official Trivy action as the authoritative public sources.
- For downstream Rancher-managed clusters, the Aqua Gateway must be reachable from those clusters. The corrected post now reflects the need to use the internal service DNS only for same-cluster installs and an external DNS name or load balancer address for remote clusters.
