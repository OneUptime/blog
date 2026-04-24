# Validation Summary: How to Configure Network Policies via Portainer on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes NetworkPolicy
- `kubectl`
- CNI plugins and NetworkPolicy enforcement

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Portainer documentation, "Create an application from a Manifest": https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer documentation, "Edit an application": https://docs.portainer.io/user/kubernetes/applications/edit
- Flannel README: https://github.com/flannel-io/flannel

## Issues Found
- The post applied a namespace-wide default-deny egress policy, but the frontend-to-backend and backend-to-database examples only allowed ingress. Under Kubernetes NetworkPolicy semantics, both source egress and destination ingress must allow a connection, so the documented flows would still be blocked. I added `allow-frontend-egress` and `allow-backend-egress` policies so the examples work as described.
- The testing section used pods without the labels required by the policies, so the "should succeed" examples would actually fail. I updated the test pods to use `--labels="app=frontend"` and `--labels="role=api-client"` where required.
- The cross-namespace test targeted `backend.production.svc.cluster.local`, but the policy example allows access to pods labeled `app: read-api`. I updated the test target to `read-api.production.svc.cluster.local`.
- The `kubectl run` examples passed commands after `--` without `--command`, which is less explicit than the current reference syntax when you intend to replace the image command. I updated the commands to use `--command --`.
- The blocked egress test used `external-service.example.com`, which may fail because the hostname does not resolve rather than because the policy blocks the connection. I replaced it with `example.com` so the test meaningfully exercises the egress rule.
- Portainer's current docs describe manifest deployment and manifest editing via the Web editor. I adjusted the Portainer wording in the description and conclusion to match the documented UI and removed an unsupported claim about a namespace view overview of policies.

## Review Notes
- The DNS example assumes cluster DNS runs in `kube-system`. Clusters using NodeLocal DNSCache or a different DNS placement may need a different egress rule.
- The test commands assume Services such as `backend` and `read-api` already exist and resolve in-cluster.
- The Kubernetes docs note that `ipBlock` behavior around rewritten Service traffic and egress can vary by network plugin. The external-access example is fine for cluster-external destinations, but it should not be read as a universal pattern for internal Service traffic.
