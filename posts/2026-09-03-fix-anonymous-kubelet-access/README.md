# How to Fix Anonymous Kubelet Access Detected by kube-hunter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Kubelet, Security

Description: Disable anonymous kubelet authentication safely, enable supported authenticated access, verify webhook authorization, and roll the fix across every node pool.

---

kube-hunter reports anonymous kubelet authentication when an unauthenticated request to the secure kubelet endpoint is accepted rather than rejected. Fixing it requires more than blocking the scanner: disable anonymous authentication in the effective kubelet configuration, ensure legitimate control-plane clients still authenticate, use webhook authorization, and restrict the network path.

## Confirm Before Changing Nodes

Preserve the target, source, kube-hunter VID and evidence, node pool, cluster version, and tool revision. From an authorized test host, send a request with **no** credentials and validate the kubelet's serving certificate with its actual trust anchor:

~~~bash
NODE=node-1.example.invalid
curl --silent --show-error \
  --cacert ./kubelet-serving-ca.pem \
  --output body.txt \
  --write-out '%{http_code}\n' \
  "https://${NODE}:10250/pods"
~~~

`200` with a Pod list confirms exposure. `403` can mean Kubernetes treated the caller as `system:anonymous` but authorization denied the operation; anonymous authentication is still enabled. `401` is the expected response when no configured authentication method accepts the request. Check kubelet logs to remove ambiguity.

Do not assume the API server's serving CA signs the kubelet certificate; kubeadm uses self-signed kubelet serving certificates by default unless signed serving certificates are configured. Obtain the correct trust material through the cluster owner. Do not use `-k`, attach a token “to see if it works,” or test exec endpoints in production. The goal is to distinguish an unauthenticated request cleanly.

## Change the Supported Source of Truth

For a self-managed cluster, configure the kubelet through the mechanism that owns node configuration. A typical `KubeletConfiguration` contains:

~~~yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
~~~

Paths and API compatibility are distribution-specific. Kubernetes documents that anonymous authentication can be disabled, X.509 client authentication requires a client CA, and bearer-token authentication requires the TokenReview webhook plus a kubeconfig for API-server access. Webhook authorization similarly requires SubjectAccessReview connectivity.

Do not blindly copy the CA path, and do not leave `authorization.mode: AlwaysAllow`. Disabling anonymous authentication prevents unauthenticated identities; it does not constrain an overprivileged authenticated identity.

If flags manage your kubelet, the documented equivalent includes `--anonymous-auth=false`, but current Kubernetes references recommend setting kubelet options via its configuration file. Resolve conflicts between service flags and config rather than assuming one wins.

For EKS, AKS, GKE, or another managed offering, use the provider-supported node and cluster settings. Node files may be regenerated during upgrade or replacement. If the provider fixes these controls by design, focus on network reachability and open a provider case when observed behavior conflicts with documentation.

## Protect the Rollout

Test one disposable or canary node pool first. Before restart or replacement, verify:

- the API server has valid kubelet client credentials where required;
- the kubelet can reach TokenReview and SubjectAccessReview APIs;
- RBAC authorizes the API server's kubelet client for required node subresources;
- health monitoring does not depend on unauthenticated kubelet endpoints;
- rollback uses a known-good node image or configuration revision.

Cordon and drain nodes according to workload disruption budgets and capacity. Rotate rather than editing in place when immutable nodes are your normal model. Watch node readiness, logs, exec/log operations through the API server, metrics collection, and autoscaling after each canary.

## Restrict the Network Too

Kubernetes lists `10250` as a kubelet API port used by control plane and nodes. Permit only the precise control-plane, monitoring, and administrative sources your architecture requires. Deny public ingress and direct access from ordinary workload networks.

Network restriction is defense in depth, not a substitute for authentication. It reduces exposure if a future configuration regression re-enables anonymous access. Validate from at least three positions: intended control-plane source, ordinary Pod, and external or corporate network.

## Remove Excess Authorization

Kubernetes' kubelet authorization reference warns that `nodes/proxy` is powerful and can include APIs capable of executing commands in containers. Audit ClusterRoles and bindings that grant it:

~~~bash
SUBJECT='system:serviceaccount:namespace:name'
NODE_NAME=node-1
kubectl auth can-i get "nodes/$NODE_NAME" --subresource=proxy --as="$SUBJECT"
kubectl auth can-i get "nodes/$NODE_NAME" --subresource=pods --as="$SUBJECT"
kubectl auth can-i get "nodes/$NODE_NAME" --subresource=log --as="$SUBJECT"
~~~

Run impersonation checks only from an authorized account. Prefer fine-grained node subresources supported by your Kubernetes version, and avoid wildcard verbs or resources.

## Validate the Fix

After every node pool is updated, repeat the credential-free request from the original scanner location. Expect `401`, not useful content. Then run kube-hunter passively with the same pinned version and exact targets:

~~~bash
kube-hunter \
  --remote node-1.example.invalid \
  --report json \
  > after.json
~~~

Confirm the anonymous-auth vulnerability is absent while documenting whether the service remains intentionally reachable. Test a legitimate API-server-mediated operation such as `kubectl logs` against a canary Pod; do not validate by directly using broad kubelet credentials.

Finally, add configuration drift detection for `authentication.anonymous.enabled`, webhook authentication, authorization mode, port exposure, and node-pool templates. Keep before/after evidence and the rollout revision.

## Prove Fleet Completeness

Query inventory for every schedulable and recently replaced node, then group validation by node pool, image revision, operating system, and bootstrap template. A clean canary does not fix older nodes left behind by a failed rotation. Sample the effective configuration and credential-free response from each group, and make the deployment controller report desired versus updated counts. Keep the issue open while any reachable node still returns useful unauthenticated data, even if most capacity is compliant.

## Conclusion

Fix anonymous kubelet access at the kubelet, not just at the scanner's firewall. Disable anonymous authentication, preserve authenticated control-plane operation, use webhook authorization, reduce direct network reachability, and roll through canary nodes. A clean passive rescan plus a successful least-privileged operational test provides strong remediation evidence.

## Official References

- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes KubeletConfiguration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Set kubelet parameters via a configuration file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [kube-hunter kubelet discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/kubelet.py)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubeadm certificate management and kubelet serving certificates](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
