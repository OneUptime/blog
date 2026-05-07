# Validation Summary: How to Configure Network Policies in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes NetworkPolicy API
- kubectl
- RKE2
- K3s
- BusyBox

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Rancher CNI Providers: https://ranchermanager.docs.rancher.com/v2.13/faq/container-network-interface-providers
- Rancher Access Clusters: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- Rancher TLS Settings: https://ranchermanager.docs.rancher.com/v2.11/getting-started/installation-and-upgrade/installation-references/tls-settings
- BusyBox command reference: https://busybox.net/BusyBox.html

## Issues Found
- The DNS allow rules were broader than described. I changed the `namespaceSelector` from `{}` to the `kube-system` namespace using the immutable `kubernetes.io/metadata.name` label, and I added TCP `53` to the database-tier DNS exception because DNS can use both UDP and TCP.
- The ingress-controller example matched `app.kubernetes.io/name: ingress-nginx` with a `namespaceSelector`, which would not reliably match a namespace. I changed it to `kubernetes.io/metadata.name: ingress-nginx` and clarified that the selector should be adjusted for Traefik or any other ingress controller namespace.
- Step 7 claimed the example restricted egress to "external IPs" even though it included `10.0.0.0/8`, which is a private CIDR. I updated the heading and description to say "IP ranges" and "internal and external IP ranges."
- The Rancher UI instructions used a version-sensitive navigation path. I replaced them with the documented `Explore` and `Create` / `Create from YAML` flow so the step remains accurate across Rancher UI variants.
- The verification example used `wget` against `http://db-service:5432`, which is not a valid way to test PostgreSQL connectivity. I replaced it with a BusyBox `nc` check, added `--command`, and added `--restart=Never` so the ephemeral test pod behavior matches current `kubectl run` semantics.
- The troubleshooting note said traffic is permitted if any policy allows it. I corrected this to reflect Kubernetes behavior: policy rules are additive within ingress and egress, but a pod-to-pod connection requires both source egress and destination ingress to allow it.

## Review Notes
- Rancher ingress defaults vary by distribution and version. K3s uses Traefik by default, and RKE2 documentation now notes that new clusters starting with v1.36 default to Traefik while `ingress-nginx` is deprecated after its March 2026 upstream EOL.
- NetworkPolicy enforcement still depends on the active CNI. Rancher documentation confirms that support depends on the network provider in use, so the post's prerequisite remains important even after the content fixes.
