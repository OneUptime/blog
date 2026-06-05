# Validation Summary: How to Configure Stacked vs External etcd Topology for HA Control Planes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- etcd
- High availability control plane topology
- TLS certificates for etcd and kube-apiserver

## Sources Consulted
- Kubernetes documentation: Options for Highly Available Topology - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/
- Kubernetes documentation: Creating Highly Available Clusters with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes documentation: Set up a High Availability etcd Cluster with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- Kubernetes kubeadm configuration API v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm configuration API v1beta3 deprecation notice - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- etcd v3.5 configuration options - https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 disaster recovery guide - https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd v3.5 clustering tutorial - https://etcd.io/docs/v3.5/tutorials/how-to-setup-cluster/

## Issues Found
- The kubeadm examples used `kubeadm.k8s.io/v1beta3`, which is deprecated in favor of `v1beta4` in current kubeadm documentation. Updated the stacked and external kubeadm configuration snippets to `kubeadm.k8s.io/v1beta4`.
- The kubeadm examples pinned `kubernetesVersion: v1.28.0`, which is outdated for a 2026 validation and unnecessarily version-specific. Updated the examples to `kubernetesVersion: stable`, matching current kubeadm HA documentation examples.
- The external etcd kubeadm certificate paths used generic `client.pem` names. Updated them to kubeadm's documented external etcd client certificate names: `apiserver-etcd-client.crt` and `apiserver-etcd-client.key`, with `etcd/ca.crt`.
- The stacked etcd `etcdctl` examples did not specify an HTTPS endpoint and used the etcd server certificate as the client certificate. Added `--endpoints=https://127.0.0.1:2379` and changed the client certificate/key to `peer.crt` and `peer.key`, consistent with Kubernetes' kubeadm etcd health-check example.
- The stacked etcd metrics example used the server certificate as a client certificate and skipped CA verification with `-k`. Updated it to use the etcd CA plus the kubeadm-generated peer certificate/key for authenticated access.
- The external topology CPU total assumed all six nodes had four cores even though the etcd node recommendation was `2-4 cores`. Updated the total to `18-24 cores`.
- The migration restore example used `etcdctl snapshot restore`, while current etcd v3.5 recovery documentation uses `etcdutl snapshot restore`. Updated the command and clarified that restore must be run once per etcd member with member-specific restore values.

## Review Notes
- The external etcd binary installation section remains a simplified example and does not show a complete systemd unit or kubeadm-managed static pod setup for etcd. Future improvements could expand that into a full production-ready setup, but the reviewed snippets are now aligned with the documented command and configuration fields.
