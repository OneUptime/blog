# Validation Summary: How to Set Up Rancher HA Behind a Load Balancer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- K3s
- Kubernetes
- Helm
- cert-manager
- NGINX
- AWS Elastic Load Balancing (ELBv2 / Network Load Balancer)
- DigitalOcean Load Balancers
- DNS

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options and external TLS guidance: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher high-availability load balancer guidance: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher Amazon ELB Network Load Balancer guide: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/infrastructure-setup/amazon-elb-load-balancer
- K3s HA embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s cluster load balancer examples: https://docs.k3s.io/datastore/cluster-loadbalancer
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- NGINX stream upstream module reference: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX load balancing reference: https://nginx.org/en/docs/http/load_balancing.html
- AWS CLI `create-load-balancer`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI `create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI `create-listener`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- DigitalOcean `doctl compute load-balancer create`: https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/create/
- DigitalOcean load balancer usage with `doctl`: https://docs.digitalocean.com/products/networking/load-balancers/getting-started/with-doctl/

## Issues Found
- The prerequisite sizing was too low for a small production Rancher management cluster. I updated it from `2 CPUs / 4 GB RAM` to `4 vCPUs / 16 GB RAM` per current Rancher installation requirements.
- The cert-manager readiness check only waited on a label-selected pod and did not verify the webhook and cainjector deployments. I replaced it with explicit rollout checks for `cert-manager`, `cert-manager-webhook`, and `cert-manager-cainjector`.
- The NGINX instructions did not ensure the `stream` module was available on Ubuntu and the replacement `nginx.conf` omitted the module include. I added `libnginx-mod-stream` to the install command and restored `include /etc/nginx/modules-enabled/*.conf;`.
- The NGINX TCP proxy timeouts were too short for Rancher’s long-lived connections. I changed `proxy_timeout` to `1800s` and `proxy_connect_timeout` to `30s` to match Rancher’s documented load balancer guidance.
- The AWS example used an Application Load Balancer flow that was incomplete for Rancher: it omitted listeners, only covered port 443, and did not match Rancher’s recommended Layer 4 forwarding pattern. I replaced it with a Network Load Balancer example using TCP target groups and listeners for both ports `80` and `443`.
- The DigitalOcean example only forwarded port `443` and used `/healthz` as the health-check path. For a K3s-based Rancher install, the correct default ingress health endpoint is `/ping`, and Rancher still expects forwarding for both `80` and `443`. I updated both the forwarding rules and the health check.
- The health-check explanation claimed the K3s setup uses `/healthz` on each node. I corrected this to `/ping` for K3s/Traefik and clarified that the NGINX example relies on passive TCP failure detection rather than active HTTP polling.
- The SSL termination section was incomplete for Rancher. I added the required Rancher setting `--set tls=external`, clarified that the load balancer should forward to node port `80`, and documented the required proxy headers.

## Review Notes
- The guide now aligns with current official Rancher guidance for K3s-based HA installs, but it still intentionally installs the latest available K3s, Helm, cert-manager, and Rancher chart versions. If reproducibility matters, the post should pin explicit versions in a future revision.
- The software load balancer example uses a single NGINX host. That is valid for fronting an HA Rancher cluster, but the load balancer itself remains a single point of failure unless you add redundancy for the load balancer tier.
