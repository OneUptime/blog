# Validation Summary: How to Configure Rancher HA with HAProxy - With

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- HAProxy
- Keepalived
- TCP load balancing
- SSL/TLS passthrough
- Rancher health checks
- Kubernetes API proxying

## Sources Consulted
- HAProxy Configuration Manual 2.8: https://docs.haproxy.org/2.8/configuration.html
- Rancher infrastructure guidance for HA RKE clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/infrastructure-setup/ha-rke1-kubernetes-cluster
- Rancher Helm chart options, including external TLS termination, recommended timeouts, and `/healthz`: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Amazon ELB/NLB guide, including hostname-based health-check guidance: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/infrastructure-setup/amazon-elb-load-balancer
- RKE2 high-availability installation guidance: https://docs.rke2.io/install/ha
- K3s cluster load balancer example for HAProxy and Keepalived: https://docs.k3s.io/datastore/cluster-loadbalancer
- Keepalived man page: https://www.keepalived.org/manpage.html

## Issues Found
- The post configured only TCP/443 for Rancher traffic. Rancher’s HA infrastructure guidance recommends forwarding both TCP/80 and TCP/443 to the Rancher management nodes, so I added the Rancher HTTP frontend/backend.
- The HAProxy timeouts were too short for Rancher’s long-lived UI/API and websocket traffic. I updated them to `timeout connect 30s` and `timeout client/server 1800s` to match Rancher’s documented recommendations.
- The HTTPS backend used `option ssl-hello-chk`. HAProxy documents that this sends an SSLv3 hello and explicitly recommends native SSL checks when SSL support is available, so I replaced it with an HTTPS `/healthz` check using SNI and the Rancher hostname, expecting HTTP `200`.
- The failover test hit the VIP by IP only and expected the response body `ok`. Rancher documents HTTP `200` on `/healthz`, and Rancher’s own load-balancer guidance recommends using the Rancher hostname with `/healthz` wherever possible to validate Rancher rather than only the ingress/default backend. I updated the test to use `curl --resolve` and check the HTTP status code.
- The Kubernetes API listener read like a default Rancher HA requirement. I marked it as optional direct Kubernetes API access and added a note that RKE2 node registration also requires port `9345` if the same load balancer is used as the fixed registration address.
- The Keepalived step depended on a package that was never installed and the two-node HA example was underspecified. I added `keepalived` to the install step, aligned the config with current HAProxy/Keepalived examples by adding `global_defs`, `script_user root`, script security, a CIDR-form VIP, and a note for the backup host, then added the service start commands.

## Review Notes
- No live Rancher/HAProxy environment was available in this workspace, so validation was documentation-based rather than runtime-tested.
- The post now accurately describes Rancher UI/API load balancing. If the same HAProxy pair is also used as the fixed registration address for an RKE2 control plane, port `9345` must be configured in addition to `6443`.
