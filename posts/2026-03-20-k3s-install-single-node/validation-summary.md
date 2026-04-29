# Validation Summary: How to Install K3s on a Single Node

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- kubectl
- Traefik Ingress
- Kubernetes Dashboard
- Helm / K3s Helm Controller
- Linux and systemd

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Helm Add-on Documentation: https://docs.k3s.io/add-ons/helm
- K3s latest release: https://github.com/k3s-io/k3s/releases/latest
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes Dashboard deployment guide: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes Dashboard sample user guide: https://raw.githubusercontent.com/kubernetes/dashboard/master/docs/user/access-control/creating-sample-user.md
- Traefik Kubernetes Ingress annotations: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- The system requirements were incorrect for a single-node K3s server. The post claimed 1 vCPU and 512 MB RAM minimum, but current K3s requirements list 2 CPU cores and 2 GB RAM for a server node. I updated the OS, CPU, RAM, disk, and architecture bullets to match current K3s guidance.
- The pinned install version was outdated. I updated the `INSTALL_K3S_VERSION` example from `v1.28.7+k3s1` to the current latest K3s release `v1.35.4+k3s1` as of 2026-04-29.
- The NodePort test example used `localhost`, but Kubernetes documents NodePort access via `NodeIP:NodePort`. I updated the example to resolve the node's internal IP and curl `http://$NODE_IP:$NODE_PORT`.
- The ingress hostname example mapped `nginx.example.com` to `127.0.0.1`, but K3s Traefik and ServiceLB expose ingress traffic on the node's IPs. I changed the example to map the hostname to the node's internal IP.
- The custom CIDR example changed `service-cidr` without also changing `cluster-dns`. K3s documents that `cluster-dns` should be in the service CIDR range, so I added `--cluster-dns=10.245.0.10`.
- The dashboard section was outdated and would not work as written. Current Kubernetes documentation supports only Helm-based Dashboard installation, not the older `recommended.yaml` manifest flow.
- The dashboard token step was incomplete because `admin-user` was never created. I added the required `ServiceAccount` and `ClusterRoleBinding` from the upstream Dashboard sample-user guide.
- The dashboard port-forward target was outdated. I updated it from `svc/kubernetes-dashboard` to `svc/kubernetes-dashboard-kong-proxy`, which is what current upstream docs use.
- The dashboard heading implied K3s ships its own dashboard. I corrected the heading to `Accessing the Kubernetes Dashboard`.
- The dashboard flow had a namespace race. I added explicit creation of the `kubernetes-dashboard` namespace before creating the sample admin ServiceAccount.

## Review Notes
- No remaining technical issues were found after the corrections above.
- The Kubernetes Dashboard project is currently Helm-only and its upstream repository is archived, so this section may need periodic review if the ecosystem shifts further toward alternatives such as Headlamp.
- The version-pinned K3s install example is accurate as of 2026-04-29 and will need periodic refreshes as new K3s releases ship.
