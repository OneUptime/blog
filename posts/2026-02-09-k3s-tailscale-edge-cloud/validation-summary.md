# Validation Summary: Configure K3s Cluster with Tailscale for Secure Edge-to-Cloud Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- K3s
- Tailscale
- Tailscale Kubernetes Operator
- CoreDNS
- Tailscale ACLs
- Tailscale subnet routers

## Sources Consulted
- K3s Server CLI options: https://docs.k3s.io/cli/server
- K3s installation configuration: https://docs.k3s.io/installation/configuration
- K3s CoreDNS custom configuration imports: https://docs.k3s.io/advanced
- Tailscale `tailscale up` CLI reference: https://tailscale.com/docs/reference/tailscale-cli/up
- Tailscale Kubernetes Operator: https://tailscale.com/docs/features/kubernetes-operator
- Tailscale Kubernetes cluster ingress: https://tailscale.com/docs/features/kubernetes-operator/how-to/cluster-ingress
- Tailscale on Kubernetes: https://tailscale.com/docs/kubernetes
- Tailscale Docker/container parameters: https://tailscale.com/docs/features/containers/docker/docker-params
- Tailscale ACLs and policy syntax: https://tailscale.com/docs/features/access-control/acls and https://tailscale.com/kb/1337/acl-syntax
- Tailscale subnet routers: https://tailscale.com/docs/features/subnet-routers
- Tailscale subnet router high availability: https://tailscale.com/docs/how-to/set-up-high-availability

## Issues Found
- The Tailscale operator manifest was incomplete because it omitted the official RBAC, service account, CRDs, and operator installation resources. Replaced it with the official Helm installation flow and noted the required OAuth scopes and `tag:k8s-operator` tag.
- The `tailscale up` examples used `--authkey`; changed them to the documented `--auth-key` flag.
- The Tailscale LoadBalancer Service example mixed the `loadBalancerClass: tailscale` pattern with the `tailscale.com/expose` annotation used for exposing existing Services. Removed the redundant expose annotation and kept the hostname annotation.
- The CoreDNS example forwarded `cloud.local` to `100.64.0.1`, which is not a general Tailscale DNS resolver for Kubernetes service records. Changed it to forward to a cloud cluster CoreDNS endpoint reachable over Tailscale and clarified the requirement for the cloud cluster domain.
- The monitoring CronJob used `alpine:latest` and ran `tailscale` without installing the CLI or mounting the host `tailscaled` socket. Changed it to use the Tailscale container image, mount `/var/run/tailscale/tailscaled.sock`, and ping a known cloud node.
- The subnet router example advertised only the K3s Pod CIDR and used `tailscale up` with `--accept-routes`. Changed it to advertise the default K3s Pod and Service CIDRs using `tailscale set`, and noted that routes must be approved or auto-approved.
- The subnet router failover example advertised only one route prefix and did not mention exact-prefix matching. Updated both nodes to advertise the same Pod and Service CIDRs and clarified that failover applies to exact matching route prefixes.
- The sidecar example omitted the Kubernetes state Secret/RBAC requirement and used a lowercase Secret key. Added `TS_KUBE_SECRET`, changed the Secret key to `TS_AUTHKEY`, set `TS_USERSPACE=false`, and noted the Secret/RBAC prerequisite.
- The benefits list claimed automatic certificate rotation for the general node-level Tailscale setup. Changed this to automatic key management.

## Review Notes
- The Tailscale ACL example is syntactically valid, but Tailscale recommends using grants for new policy work because ACLs no longer receive new features.
- The K3s flags shown are current, but changing `--flannel-iface`, node IPs, or cluster CIDRs on an existing cluster should be planned carefully because these values affect node and network identity.
