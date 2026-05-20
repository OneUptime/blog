# Validation Summary: How to Use ArgoCD with Hetzner Cloud Kubernetes

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Argo CD
- Kubernetes
- k3s
- Hetzner Cloud Controller Manager
- Hetzner Cloud CSI Driver
- Hetzner Cloud Load Balancers
- Hetzner Cloud Volumes
- Hetzner Cloud Networks and Firewalls
- ingress-nginx
- Helm
- Harbor
- GitHub Container Registry / OCI Helm repositories

## Sources Consulted
- Argo CD Getting Started: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD OCI and private repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/ and https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- K3s Networking Services and external cloud controller guidance: https://docs.k3s.io/networking/networking-services
- Hetzner Cloud Controller Manager quick start and load balancer annotations: https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/docs/guides/quickstart.md and https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/docs/reference/load_balancer_annotations.md
- Hetzner Cloud CSI Driver getting started guide: https://github.com/hetznercloud/csi-driver/blob/main/docs/kubernetes/getting-started.md
- Hetzner Cloud server, location, billing, networks, volumes, and firewall docs: https://docs.hetzner.com/cloud/servers/overview/ , https://docs.hetzner.com/cloud/general/locations/ , https://docs.hetzner.com/cloud/billing/faq/ , https://docs.hetzner.com/cloud/volumes/overview/ , https://docs.hetzner.com/cloud/firewalls/faq/
- Hetzner 2026 price adjustment: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- ingress-nginx TLS/SSL passthrough documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- Harbor Helm chart repository: https://github.com/goharbor/harbor-helm

## Issues Found
- Updated deprecated Hetzner CX31/CX21 server recommendations and old pricing examples to current CX33/CX23-era wording and 2026 Hetzner price-adjustment figures.
- Replaced raw manifest install examples for Hetzner Cloud Controller Manager and the CSI driver with the current official Helm-based installation flow, and added Helm to prerequisites.
- Enabled `networking.enabled=true` for the Hetzner Cloud Controller Manager Helm install so the previously created `network` secret value is actually used.
- Added `controller.extraArgs.enable-ssl-passthrough` to the ingress-nginx Argo CD Application because Argo CD's nginx SSL passthrough ingress requires the controller flag.
- Changed the Argo CD ingress backend service port reference from numeric port `443` to named port `https`, matching the official Argo CD ingress examples and the installed service.
- Updated the Hetzner Cloud Controller Manager log selector to the Helm chart's `app.kubernetes.io/name=hcloud-cloud-controller-manager` label.
- Added current Hetzner locations `hil` and `sin`, and changed the private networking guidance from "same location" to "same network zone".
- Corrected the Node Connectivity troubleshooting section because Hetzner Cloud Firewalls do not filter private Cloud Network traffic; the example now uses a host-level firewall rule.
- Updated the Harbor chart target revision from `1.14.x` to `1.19.x`, matching the current Harbor Helm chart line.

## Review Notes
- The cost table remains an approximation; exact cloud costs depend on region, VAT, exchange rates, assigned Primary IPs, and selected node types.
- The direct LoadBalancer service and ingress examples are both valid exposure patterns, but production deployments should pin chart and manifest versions rather than relying on floating branches or broad semver ranges.
