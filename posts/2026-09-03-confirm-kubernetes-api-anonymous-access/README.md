# How to Confirm Kubernetes API Anonymous Access After a kube-hunter Finding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Security, API Server

Description: Confirm what an unauthenticated Kubernetes API caller can actually access, separate authentication from RBAC, and remediate broad anonymous permissions safely.

---

Kubernetes can treat a request with no accepted credentials as `system:anonymous`, in the `system:unauthenticated` group. That behavior is not automatically a critical vulnerability: clusters may deliberately allow narrow health or version endpoints. The security question is which paths are reachable anonymously and what data or operations their authorization permits.

After a kube-hunter finding, verify the exact endpoint and permission without sending credentials or performing writes.

## Capture the Finding and Target

Preserve the kube-hunter VID, hunter, evidence, API address, scanner source, tool revision, and UTC time. Confirm whether the target is the real API server, a reverse proxy, an aggregated API, or an unrelated service on a familiar port.

Current kube-hunter API discovery checks known API ports, tries HTTP and HTTPS, and uses API-like response behavior to classify services. Its hunters then probe particular paths. Read the source from the exact revision before interpreting a display label.

Obtain the API hostname and CA through an approved inventory channel. Do not use an administrator kubeconfig in the anonymous test, because even an implicit client certificate changes the identity.

## Make a Truly Credential-Free Request

Use a clean environment and explicit CA:

~~~bash
API=api.example.invalid:6443
env -i PATH="$PATH" \
  curl -q --silent --show-error \
  --cacert ./cluster-ca.pem \
  --dump-header headers.txt \
  --output version.json \
  --write-out '%{http_code}\n' \
  "https://${API}/version"
~~~

Do not include `Authorization`, cookies, a client key, or `-k`. A `200` on `/version` proves anonymous access to that non-resource URL, not access to Pods or Secrets. A `401` means authentication rejected the no-credential request. A `403` generally means the caller reached authorization but the requested action was denied.

Test only the paths cited in the finding plus a minimal, preapproved matrix. Read-only examples might include `/`, `/version`, `/api`, and `/apis`; even discovery output can reveal enabled APIs, so protect it. Do not POST, PATCH, DELETE, request Secrets, or use an active hunter in production.

~~~bash
for path in / /version /api /apis; do
  code=$(curl -q --silent --show-error \
    --cacert ./cluster-ca.pem \
    --output "response-${path//\//_}.txt" \
    --write-out '%{http_code}' \
    "https://${API}${path}")
  printf '%-12s %s\n' "$path" "$code"
done
~~~

## Separate Authentication and Authorization

Anonymous authentication creates an identity; an authorizer still decides each request. With RBAC, inspect bindings for the exact subject and group:

~~~bash
kubectl get clusterrolebindings,rolebindings --all-namespaces \
  -o yaml > bindings.yaml
rg -n 'system:anonymous|system:unauthenticated' bindings.yaml
~~~

Also review default and automatically reconciled ClusterRoles carefully. Do not edit `system:` roles casually. A wildcard subject in old policy is not necessarily equivalent to anonymous access; use the current Kubernetes authentication documentation for the cluster version.

An administrator can perform authorization checks with impersonation:

~~~bash
kubectl auth can-i get pods --all-namespaces \
  --as=system:anonymous \
  --as-group=system:unauthenticated
~~~

This is useful corroboration, but the direct no-credential request is the end-to-end proof. The administrator running impersonation needs permission to impersonate those identities, and proxies or admission layers can make paths differ.

## Choose the Correct Remediation

If anonymous callers can read workload resources or perform writes, remove the responsible RBAC/authorization grant immediately through version-controlled policy. Search for RoleBindings as well as ClusterRoleBindings and for non-resource URL grants.

If no anonymous access is required, disable it with the API server's supported `--anonymous-auth=false` configuration or the managed provider's setting. Test health checks first; external load balancers or bootstrap processes may depend on anonymous health endpoints.

Current Kubernetes supports an `AuthenticationConfiguration` that can enable anonymous authentication only for explicit conditions such as `/livez`, `/readyz`, and `/healthz`. This endpoint-scoped mechanism is version-dependent, so use the API version and feature state documented for your cluster release rather than copying a current example to an older control plane.

For managed Kubernetes, do not edit control-plane flags you do not own. Remove customer-managed RBAC grants, restrict the API network endpoint, and use the provider's supported access configuration.

## Validate From Multiple Paths

Repeat the exact credential-free matrix from the original scanner source. Confirm formerly exposed resource paths return `401` or `403` and allowed health paths return only their intended minimal response. Then run the same pinned passive kube-hunter version and targets.

Review API audit logs for `user.username=system:anonymous` during both the exposure window and validation. Audit policy determines what is captured, so absence of records is not proof of absence. Restrict the API endpoint with private networking or authorized source ranges as defense in depth.

## Account for Default Discovery Access

Kubernetes ships default RBAC roles used for API discovery and public information, and the API server may automatically reconcile `system:` roles and bindings. Inspect the rules for the cluster's exact release before deleting or editing them. Prefer removing your own broad binding or using supported anonymous endpoint configuration. A hand-edited default role can be restored at control-plane startup and can also break clients that rely on discovery; validate the resulting API discovery and health behavior with an ordinary authenticated user.

## Conclusion

Confirm anonymous API access with a clean, CA-validated, credential-free request to the exact reported path. A public `/version` response and anonymous Secret access are radically different findings. Map allowed paths to RBAC and non-resource URL policy, remove broad grants, disable or endpoint-limit anonymous authentication where supported, and validate end to end from the original network position.

## Official References

- [Kubernetes authentication: anonymous requests](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#anonymous-requests)
- [Kubernetes authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [kube-hunter API server discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/apiserver.py)
- [kube-hunter API server hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/apiserver.py)
