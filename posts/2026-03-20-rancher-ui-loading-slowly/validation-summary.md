# Validation Summary: How to Troubleshoot Rancher UI Loading Slowly

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Rancher Manager
- K3s
- Kubernetes
- `kubectl`
- NGINX
- ingress-nginx
- MySQL

## Sources Consulted
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher guide for high-availability K3s for Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/k3s-for-rancher
- Rancher Docker install with TLS termination at Layer-7 NGINX load balancer: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/advanced-user-guides/configure-layer-7-nginx-load-balancer
- Rancher single-node Docker advanced options: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/single-node-rancher-in-docker/advanced-options
- K3s cluster datastore documentation: https://documentation.suse.com/external-tree/en-us/cloudnative/k3s/latest/en/datastore/datastore.html
- K3s HA external datastore documentation: https://documentation.suse.com/external-tree/en-us/cloudnative/k3s/latest/en/datastore/ha.html
- K3s backup and restore documentation: https://documentation.suse.com/external-tree/en-us/cloudnative/k3s/latest/en/datastore/backup-restore.html
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl set resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kube-apiserver` reference (`--event-ttl`): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post used a JSON Patch with `replace` operations to set Rancher deployment resources. That patch fails if the resource keys do not already exist. I replaced it with `kubectl set resources`, which is the documented command for setting requests and limits on pod-template resources.
- The datastore section implied a fixed Rancher MySQL schema and hardcoded the database user and name as `rancher`. I corrected it to describe the K3s management-cluster datastore case explicitly and changed the command to use generic `<db-user>` and `<database-name>` placeholders.
- The SQLite example checked a specific `state.db` file while K3s documentation refers to the datastore directory under `/var/lib/rancher/k3s/server/db/`. I updated the example to check the datastore directory size instead.
- The stale-resource section had comments that did not match the commands. `kubectl get events -A --no-headers | wc -l` counts events cluster-wide, not per namespace, and the Helm command only lists release secrets rather than cleaning them up. I corrected those comments.
- The NGINX reverse-proxy example was incomplete for `listen 443 ssl` and omitted headers Rancher documents as required (`Host`, `X-Forwarded-Proto`, `X-Forwarded-Port`, `X-Forwarded-For`). I updated the snippet to align with Rancher’s documented Layer-7 NGINX example.
- The HTTP/2 section used `nginx.ingress.kubernetes.io/use-http2`, which is not a documented ingress-nginx annotation. I replaced it with the controller ConfigMap `use-http2` setting, which is the documented configuration point.

## Review Notes
- `kubectl top` is valid, but it depends on Metrics Server being installed and working in the management cluster.
- Rancher’s documentation generally prefers a Layer-4 load balancer for HA management clusters; the Layer-7 NGINX example is appropriate when TLS termination is intentionally handled at the proxy.
- The request paths shown in browser DevTools can vary across Rancher versions because Rancher still exposes the legacy v3 API while also using Kubernetes-style management APIs.
