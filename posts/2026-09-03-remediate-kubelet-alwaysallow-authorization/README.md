# How to Remediate Kubelet `AlwaysAllow` Authorization Findings from kube-hunter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Kubelet, Security

Description: Replace kubelet AlwaysAllow authorization with webhook decisions, repair required RBAC, reduce node proxy grants, and validate the rollout without active exploitation.

---

Kubelet authentication answers “who is calling?” Authorization answers “may that identity perform this operation?” With `AlwaysAllow`, every request that reaches authorization is allowed. Disabling anonymous authentication is necessary but cannot compensate for `AlwaysAllow`: any accepted client certificate or bearer token retains unrestricted kubelet API access.

Kubernetes documents `Webhook` as the mode that delegates kubelet decisions to the API server through `SubjectAccessReview`. Remediation is a controlled migration to that mode, backed by correct authentication and narrowly scoped RBAC.

## Establish the Effective State

Capture the affected nodes, pools, versions, kube-hunter result, and exact source revision. Then retrieve the effective kubelet configuration using your distribution's supported method. Avoid judging only a process flag; a configuration file, bootstrap template, or managed-node image may be authoritative.

The risky shape is:

~~~yaml
authorization:
  mode: AlwaysAllow
~~~

The desired shape is:

~~~yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
~~~

The authentication settings are shown because webhook authorization needs a trustworthy identity. Adapt API version and surrounding fields to the Kubernetes release and distribution; do not replace the entire kubelet configuration with this fragment.

## Understand the Authorization Mapping

The kubelet converts HTTP operations into Kubernetes authorization attributes. Official documentation maps paths such as `/stats/*` to `nodes/stats`, `/metrics/*` to `nodes/metrics`, and `/logs/*` to `nodes/log`; other endpoints can fall back to `nodes/proxy` depending on version and feature gates.

`nodes/proxy` is especially dangerous. Kubernetes warns that it grants access to APIs that can execute commands in containers, and that `get` is not safely read-only because some streaming endpoints initiate through HTTP GET. Audit grants before the migration:

~~~bash
kubectl get clusterroles,clusterrolebindings -o yaml \
  > rbac-before.yaml

SUBJECT='system:serviceaccount:namespace:name'
NODE_NAME=node-1
kubectl auth can-i get "nodes/$NODE_NAME" --subresource=proxy --as="$SUBJECT"
kubectl auth can-i get "nodes/$NODE_NAME" --subresource=metrics --as="$SUBJECT"
~~~

Impersonation requires its own privilege. Review wildcard grants manually and identify the API server's kubelet client identity, monitoring agents, log collectors, and legitimate node administrators.

## Prepare the Webhook Dependencies

Kubernetes requires the `authorization.k8s.io/v1` API group and kubelet connectivity to the API server for SubjectAccessReview. The kubelet also needs a kubeconfig. Verify certificate trust, endpoint DNS, network route, and authorization-review latency from a canary node.

Ensure the API server's configured kubelet client identity has the required node subresource permissions. Kubernetes' reference lists proxy, stats, log, spec, and metrics for the traditional model, with additional fine-grained subresources in newer versions. Use the list for the exact cluster release. Do not grant `cluster-admin` as a shortcut.

Webhook authorization has decision caches. Account for documented authorized and unauthorized cache TTLs when testing changes; an immediate repeated request may reflect a cached decision.

## Roll Out Through a Canary

For immutable infrastructure, create a node pool from a corrected image or bootstrap configuration. For self-managed mutable nodes, follow the supported service restart workflow. In either case:

1. Confirm spare capacity and disruption budgets.
2. Cordon and drain one canary node safely.
3. Apply the owned configuration and restart or replace it.
4. Wait for `Ready` and inspect kubelet and API audit logs.
5. Exercise approved operations through the API server: scheduling a canary Pod, fetching logs, metrics collection, and an explicitly authorized exec into that canary.
6. Confirm an unauthorized test identity is denied.

Stop if nodes become NotReady, SubjectAccessReview calls fail, control-plane log/exec breaks, or the kubelet falls back to unexpected behavior. Never combine the authorization migration with unrelated node upgrades if you need a clear rollback signal.

Managed services may not expose raw kubelet settings. Change the provider-supported node pool or security setting, rotate nodes, and escalate to the provider if `AlwaysAllow` is observable. Manual edits to managed nodes are usually ephemeral and can put the cluster outside support.

## Add Network Containment

Allow port `10250` only from required control-plane and monitoring sources. Direct ordinary-Pod access should normally be denied. This does not replace Webhook mode; it limits the number of identities and paths that can exercise a future authorization mistake.

Test from the original kube-hunter vantage point and from an approved administrative path. A firewall timeout and an authorization denial answer different controls, so retain both results.

## Validate Without Exploiting Workloads

Run the same pinned passive kube-hunter build and exact targets after rollout. Compare by VID and location, not row order. Verify effective configuration on a sample from every pool and inspect audit evidence for denied SubjectAccessReview decisions.

Avoid enabling `--active` in production. Current kube-hunter active kubelet logic can attempt container operations and read tokens or environment variables. Configuration evidence, denied benign requests, legitimate operational tests, and a passive rescan are sufficient remediation evidence.

## Monitor Webhook Failure Behavior

After rollout, alert on sustained TokenReview or SubjectAccessReview errors and latency, not only explicit denials. A broken route or expired client credential can make legitimate kubelet operations fail even though the authorization mode is correct. Correlate kubelet logs with API-server audit and availability signals during node replacement. Do not “temporarily” restore `AlwaysAllow` to recover service; use the rehearsed configuration rollback or repair the webhook dependency, then repeat the authorization tests.

## Conclusion

Replace `AlwaysAllow` with `Webhook`, but treat the migration as an authentication, API connectivity, and RBAC change—not a one-line flag flip. Audit powerful `nodes/proxy` grants, prepare required control-plane permissions, canary the rollout, restrict port `10250`, and validate both allowed and denied paths. That fixes the authorization boundary without using production containers as proof targets.

## Official References

- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes authorization overview](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes KubeletConfiguration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [kube-hunter kubelet hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/kubelet.py)
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
