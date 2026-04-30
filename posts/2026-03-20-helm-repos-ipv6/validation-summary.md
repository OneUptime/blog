# Validation Summary: How to Configure Helm Repositories over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- OCI registries
- ChartMuseum
- Harbor
- Docker Compose
- Kubernetes Services
- IPv6
- TLS / X.509 certificate validation

## Sources Consulted
- Helm CLI docs: `helm repo add` - https://helm.sh/docs/helm/helm_repo_add/
- Helm CLI docs: `helm registry login` - https://helm.sh/docs/helm/helm_registry_login/
- Helm CLI docs: `helm push` - https://helm.sh/docs/helm/helm_push/
- Helm CLI docs: `helm pull` - https://helm.sh/docs/helm/helm_pull/
- Helm CLI docs: `helm show chart` - https://helm.sh/docs/helm/helm_show_chart/
- Helm CLI docs: `helm install` - https://helm.sh/docs/helm/helm_install/
- Helm topic docs: OCI registries - https://helm.sh/docs/topics/registries/
- ChartMuseum official README - https://github.com/helm/chartmuseum
- ChartMuseum source for `listen-host` / `LISTEN_HOST` - https://raw.githubusercontent.com/helm/chartmuseum/main/pkg/config/vars.go
- ChartMuseum router source showing host+port binding behavior - https://raw.githubusercontent.com/helm/chartmuseum/main/pkg/chartmuseum/router/router.go
- ChartMuseum `helm cm-push` plugin README - https://github.com/chartmuseum/helm-push
- Harbor current docs: OCI Helm charts - https://goharbor.io/docs/2.14.0/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- Harbor older docs: ChartMuseum-backed Helm repos - https://goharbor.io/docs/2.0.0/working-with-projects/working-with-images/managing-helm-charts/
- Docker Compose file reference (`ports`, IPv6 host IP syntax) - https://docs.docker.com/reference/compose-file/services/
- Docker IPv6 networking docs - https://docs.docker.com/engine/daemon/ipv6/
- Kubernetes dual-stack Services docs - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 3986 URI syntax for IPv6 literals - https://www.rfc-editor.org/rfc/rfc3986
- RFC 6125 service identity / IP subjectAltName matching - https://www.rfc-editor.org/rfc/rfc6125

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::chartserver`. IPv6 literals can only contain valid IPv6 address syntax, so the examples were corrected to real documentation-safe IPv6 addresses.
- The ChartMuseum bind examples used `--listen-addr` and `LISTEN_ADDR`, but current ChartMuseum exposes `--listen-host` / `LISTEN_HOST`. The commands and Compose example were corrected accordingly.
- The post used Helm's built-in `helm push` against ChartMuseum. Current Helm reserves `helm push` for OCI registries; ChartMuseum uploads use the `helm cm-push` plugin. The post was updated to `helm cm-push` and now makes the plugin dependency explicit.
- The OCI login example said `--insecure` was for registries without TLS. Helm documents `--plain-http` for non-TLS HTTP registries, while `--insecure` is for TLS registries without valid certs. The wording was corrected.
- The post claimed `helm show chart` lists versions in an OCI registry. It does not; it shows chart metadata for a selected reference. That description was corrected.
- The Harbor section mixed current OCI usage with an older ChartMuseum-backed `/chartrepo/...` example. Current Harbor docs focus on OCI Helm charts, so the section was corrected to the current OCI workflow.
- The Compose example implied IPv6 exposure without enabling an IPv6 Compose network and used the wrong ChartMuseum env var. The example now uses `LISTEN_HOST` and an `enable_ipv6: true` network.
- The proxy diagnostic command used `helm env | grep -i proxy`, which does not inspect the shell proxy variables that typically affect HTTP(S) clients. It was corrected to inspect `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`.
- The sample `repositories.yaml` used `apiVersion: ""`, which is incorrect for current Helm repository config files. It was corrected to `apiVersion: v1`.
- The conclusion overstated the TLS certificate rule. It now correctly states that when connecting by literal IPv6 address, the certificate must contain that IP as an `iPAddress` SAN.

## Review Notes
- Current Helm and Harbor documentation both support OCI-based chart workflows; Harbor's older ChartMuseum-backed repository flow exists in historical docs, but it is not the current primary guidance.
- The Docker example still depends on host-side Docker IPv6 support being enabled, which is now noted in the snippet.
