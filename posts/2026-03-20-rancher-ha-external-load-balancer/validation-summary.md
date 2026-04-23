# Validation Summary: How to Configure Rancher HA with External Load Balancer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- High-availability load balancing
- TLS passthrough and external TLS termination
- AWS Network Load Balancer (NLB) and AWS CLI
- HAProxy
- Keepalived / VRRP
- K3s
- RKE2

## Sources Consulted
- Rancher Helm chart options and external TLS termination: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher guide for HA RKE2 used with Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- K3s Cluster Load Balancer documentation: https://docs.k3s.io/datastore/cluster-loadbalancer
- AWS CLI `create-target-group` reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI `create-listener` reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS Network Load Balancer CLI guide: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/create-network-load-balancer.html
- HAProxy configuration manual (`check-ssl`, `option tcp-check`): https://docs.haproxy.org/2.4/configuration.html
- Keepalived user guide (VRRP failover framework): https://www.keepalived.org/pdf/UserGuide.pdf

## Issues Found
- The AWS NLB example registered backend targets by IP address but did not set `--target-type ip`. AWS defaults target groups to `instance`, so the example would not work as written. Added `--target-type ip`.
- The AWS NLB example created a load balancer and target group but never created a listener. Added the `aws elbv2 create-listener` command required to forward traffic to the target group.
- The TLS termination explanation was too generic. Rancher’s documented Helm configuration for external TLS termination expects traffic to be forwarded to Rancher on port `80` with `--set tls=external`. Updated the wording accordingly and added Rancher’s documented recommendation for Layer 4 forwarding of ports `80` and `443`.
- The HAProxy comment described `check-ssl` as an HTTPS health check. In this configuration it performs a TLS handshake health check, not an HTTP `/healthz` check. Corrected the comment.
- The control-plane load-balancing guidance omitted RKE2 port `9345`, which Rancher and RKE2 both document as required for node registration in HA setups. Added an RKE2 supervisor frontend/backend and corrected the conclusion.
- The Kubernetes control-plane guidance did not mention TLS SAN requirements for a fixed registration address or VIP. Added a note to include the load balancer DNS name or VIP in the cluster TLS SANs.
- The Keepalived section incorrectly presented Keepalived as a load-balancing alternative. Keepalived VRRP provides VIP failover, not traffic distribution by itself. Reframed the section so it is clearly used to front a pair of external load balancer nodes.
- The health-check section labeled `/v3/settings/server-version` as a health check. It is an API version-information call, not the Rancher health-check endpoint. Updated the wording so `/healthz` remains the health check and `server-version` is described separately.

## Review Notes
- The examples use placeholder subnets, VPC IDs, ARNs, and node IPs. That is appropriate for a tutorial as long as the command structure is correct.
- Rancher documents `/healthz` as the load balancer health-check endpoint and recommends long-lived websocket support plus the correct proxy headers when TLS is terminated externally; this post now aligns with those requirements.
- The AWS and HAProxy examples still focus on the `443` listener path for Rancher access. The review added notes about also forwarding port `80` when operators want Rancher’s built-in HTTP-to-HTTPS redirect through the load balancer.
