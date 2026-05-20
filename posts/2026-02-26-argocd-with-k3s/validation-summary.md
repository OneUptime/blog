# Validation Summary: How to Use ArgoCD with K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- K3s
- Kubernetes
- Traefik
- ApplicationSet
- Kustomize
- ServiceLB / Klipper LoadBalancer
- Local Path Provisioner
- embedded etcd

## Sources Consulted
- K3s documentation: https://docs.k3s.io/
- K3s networking services: https://docs.k3s.io/networking/networking-services
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s high availability embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s architecture: https://docs.k3s.io/architecture
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_add/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- The post said containerd is the only K3s container runtime and that Docker is unavailable. K3s uses containerd by default, but its server CLI documents optional cri-dockerd support via Docker integration, so the statement was narrowed.
- The post described K3s as shipping Traefik v2 by default. Current K3s documentation says K3s ships Traefik v3, with release-specific version details, so the wording now covers current and older K3s releases.
- The Traefik `IngressRoute` examples used the older `traefik.containo.us/v1alpha1` API group and attempted `tls.passthrough` on HTTP `IngressRoute`. Current Traefik CRDs use `traefik.io/v1alpha1`, and TLS passthrough belongs on `IngressRouteTCP`, so the examples were corrected.
- The standard Kubernetes Ingress example called the `router.tls` annotation SSL passthrough and routed to service port 443. Traefik's documentation describes that annotation as enabling TLS termination, so the example now routes to port 80 for the insecure Argo CD server mode.
- The Redis persistence section implied K3s automatically provides Redis persistence for Argo CD. The default Argo CD manifests do not create persistent Redis storage, so the text now says `local-path` can provision PVCs if persistence is explicitly added.
- The ServiceLB section said Klipper assigns a node IP. K3s documentation describes ServiceLB as using node host ports and reporting node IPs for LoadBalancer services, so the text was corrected.
- The scheduling section said K3s server nodes are tainted by default. K3s server nodes run agent components by default and can schedule workloads unless taints are configured, so the section now applies only to clusters where server nodes have been tainted.

## Review Notes
The Kustomize resource patches are syntactically valid for Kustomize-style JSON patches, and Argo CD's official installation documentation supports using the stable install manifests as remote Kustomize resources. The post uses `stable` manifests, so exact installed Argo CD component versions and bundled resource defaults can change over time.
