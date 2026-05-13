# Validation Summary: How to Configure Calico on K3s for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- K3s
- Kubernetes
- Calico
- Calico IPPool resources
- Calico FelixConfiguration resources
- Calico BGPConfiguration resources
- calicoctl
- kubectl

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s server CLI reference: https://docs.k3s.io/cli/server
- Calico Quickstart for Calico on K3s: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/quickstart
- Calico K3s multi-node install: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/multi-node-install
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico multiple IP pools documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico v3.32 CRD manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml

## Issues Found
- The introduction incorrectly implied that K3s datastore choices directly change how Calico stores state. Updated it to say that standard Kubernetes Calico installations use the Kubernetes API datastore, regardless of whether K3s is backed by sqlite, embedded etcd, or an external datastore.
- The prerequisites omitted K3s custom-CNI requirements. Added `--flannel-backend=none` and `--disable-network-policy`, matching K3s and Calico K3s installation guidance.
- The Calico pod verification command only checked `kube-system`, which is not correct for operator installs where Calico pods run in `calico-system` and `tigera-operator`. Updated it to check all namespaces.
- `calicoctl node status` was shown without the host-node caveat. Added `sudo` and a note that the command should be run on a node host and is most useful with BGP.
- The default CIDR explanation implied `192.168.0.0/16` was the K3s default. Updated it to state K3s defaults to `10.42.0.0/16`, while Calico's K3s examples use `192.168.0.0/16` when explicitly configured.
- The IPPool example did not mention operator-managed pools. Added a note to use the Tigera operator `Installation` resource or disable operator IP pool management before managing pools with calicoctl.
- The Felix tuning used `120s` intervals while describing resource reduction. Updated the refresh intervals to `300s`, which better matches the stated goal of reducing Felix dataplane refresh overhead.
- The node selector example assumed K3s agent nodes already have `node-role.kubernetes.io/agent=true`. Added an explicit `kubectl label node` command.
- The node selector example created a pool overlapping the default pool without warning. Added a command to disable the existing default pool before creating the narrower pool.
- The BGP section described disabling unnecessary components, but the shown resource only disables BGP node-to-node mesh. Updated the heading and wording, and added a warning not to disable it for multi-node IPIP deployments without another route distribution method.
- The final rollout restart command assumed `calico-node` was in `kube-system`. Updated it to discover the DaemonSet namespace before restarting.

## Review Notes
The post is technically valid after edits. Future improvements could include showing equivalent Tigera operator `Installation` examples for users who installed Calico with the operator, but the current calicoctl examples are valid for calicoctl-managed resources.
