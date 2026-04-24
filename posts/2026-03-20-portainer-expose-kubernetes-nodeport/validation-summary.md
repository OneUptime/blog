# Validation Summary: How to Expose Portainer on Kubernetes via NodePort - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Services
- Kubernetes NodePort
- Helm
- `kubectl`
- HAProxy

## Sources Consulted
- Portainer Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- Portainer CE install on Kubernetes (bare metal): https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer Helm chart values: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer Helm service template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/service.yaml
- Portainer Helm selector labels helper: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/_helpers.tpl
- Portainer CE Kubernetes NodePort manifest: https://downloads.portainer.io/ce-lts/portainer.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes blog on Endpoints deprecation: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- kube-proxy CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- HAProxy frontend configuration basics: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/

## Issues Found
- The Helm install example used `service.nodePort`, which is not a current Portainer chart value. I changed it to `service.httpNodePort`, added the official Portainer Helm repository setup, and added `--create-namespace` so the install example matches current Portainer documentation and chart behavior.
- The values.yaml example used `nodePort` instead of `httpNodePort`. I corrected the field name to the current chart key.
- The expected `kubectl get svc` output omitted the Edge tunnel NodePort exposed by the current Portainer NodePort service. I updated the example to include the third port.
- The manual Service example used `selector: app: portainer`, which does not match the official Portainer Helm chart labels. I updated the selector to `app.kubernetes.io/name` and `app.kubernetes.io/instance`, and adjusted the note so readers know the selector and target ports must match their existing deployment.
- The JSON patch example only updated two NodePorts even though the guide configures three service ports. I added the Edge NodePort patch for consistency with the rest of the post.
- The troubleshooting section used `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33+. I replaced it with an `EndpointSlice` query using the standard `kubernetes.io/service-name` label.
- The NodePort self-test used `https://localhost:30779`, which is not reliable on current kube-proxy configurations. I changed it to use a real node IP and clarified that the kube-proxy check only applies on kube-proxy-based clusters.
- The HAProxy example was placed in an `nginx` code fence. I corrected the fence to `haproxy`.
- The sample node output and wording used `master`; I updated that example to `control-plane` to match current Kubernetes terminology.
- The statement that all node IPs work was too absolute. I qualified it with “By default” because kube-proxy can restrict accepted NodePort addresses via `--nodeport-addresses`.

## Review Notes
- Portainer's current Helm chart defaults `service.type` to `NodePort`, so the explicit `--set service.type=NodePort` is valid but redundant.
- Portainer serves HTTPS on `30779` with a self-signed certificate by default unless you configure your own certificate or force a different TLS setup.
- For manual Services, the Edge tunnel port must match how the Portainer deployment was started. The example now reflects the official Portainer NodePort manifests, but deployments created differently may need a different `targetPort`.
