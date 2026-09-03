# 401 or 403? How to Separate Kubernetes API Authentication Failures from RBAC Denials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API, Authentication, Authorization, HTTP 401, 403 Forbidden, RBAC, Kubernetes RBAC, Troubleshooting

Description: Use Kubernetes status responses, identity checks, access reviews, and audit evidence to distinguish failed authentication from denied authorization.

---

Kubernetes API access is a pipeline: establish an identity, authorize that identity for the request attributes, then run admission for applicable operations. That order makes the HTTP status a useful first split:

- `401 Unauthorized` normally means no configured authenticator accepted the presented credential.
- `403 Forbidden` normally means the API server had an identity but no authorizer allowed the requested action.

The distinction prevents two dangerous detours. Adding broad RBAC cannot repair an expired token, and rotating credentials cannot grant an authenticated user permission to delete a Deployment.

## Capture the Actual Response

Start with the same binary, context, namespace, and operation that failed:

```bash
kubectl config current-context
kubectl config view --minify
kubectl --v=6 get pods -n payments
```

Keep the Kubernetes `Status` response body. A typical authorization message identifies the user, verb, resource, API group, and namespace. Those are the exact attributes to test. Do not share verbose output until it has been checked for endpoint details, usernames, and other sensitive data; never use `kubectl config view --raw` in a ticket.

Also establish that the response came from the Kubernetes API server. An ingress, authenticating proxy, identity-aware load balancer, or service mesh can return its own 401 or 403 before the request reaches Kubernetes. Correlate API server audit records and proxy logs rather than interpreting every HTTP status as an RBAC verdict.

## A 401 Is an Authentication Investigation

For a 401, inspect how the selected kubeconfig user obtains credentials:

```bash
kubectl config view --minify -o yaml
```

Common causes include:

- an expired, not-yet-valid, malformed, or revoked bearer token;
- an OIDC issuer or audience mismatch;
- an exec credential plugin using the wrong account or failing to refresh;
- an expired client certificate or one signed by an untrusted client CA;
- a ServiceAccount token read once and cached beyond its projected lifetime; and
- a token-authentication webhook that rejects the credential.

Fix the credential source and retry with a newly issued credential. Do not create a RoleBinding yet: authorization is downstream and was not reached successfully.

Anonymous access adds an important nuance. When enabled, a request without an accepted credential can sometimes proceed as `system:anonymous` in `system:unauthenticated`; if that identity lacks permission, the result can be 403 rather than 401. Conversely, a rejected bearer token is not proof that anonymous fallback will be used. Read the response and audit identity instead of assuming.

## A 403 Is an Authorization Investigation

Ask the API server who the current credential represents:

```bash
kubectl auth whoami -o yaml
```

Then test the denied action precisely:

```bash
kubectl auth can-i list pods -n payments
kubectl auth can-i get deployments.apps -n payments
kubectl auth can-i create pods --subresource=exec -n payments
kubectl auth can-i get /readyz
```

`kubectl auth can-i` creates a `SelfSubjectAccessReview`, so it works across supported authorization modes; it is not limited to RBAC. Match all request dimensions:

| Dimension | Frequent mismatch |
| --- | --- |
| Verb | `get` on one object is different from `list` or `watch` |
| API group | `deployments` belongs to `apps`, while Pods use the core group |
| Resource/subresource | `pods`, `pods/log`, and `pods/exec` are distinct |
| Namespace | A RoleBinding grants within its namespace; cluster-scoped resources have none |
| Resource name | A rule restricted by `resourceNames` does not cover every object |
| Non-resource URL | Paths such as `/readyz` use `nonResourceURLs`, not resource rules |

An administrator may test another identity with impersonation:

```bash
kubectl auth can-i list pods -n payments --as=alice@example.com
kubectl auth can-i list pods -n payments \
  --as=system:serviceaccount:payments:reporter
```

Impersonation itself requires authorization. A failure from `--as` may mean the operator cannot impersonate the requested user, not that the target user lacks the tested permission.

## Trace RBAC Bindings Without Guessing

If the cluster uses RBAC, map the authenticated username and groups to RoleBindings and ClusterRoleBindings. A RoleBinding can reference either a Role in its own namespace or a ClusterRole, but its grant remains namespace-scoped. A ClusterRoleBinding grants the referenced ClusterRole across the cluster.

Inspect candidates rather than dumping every secret-bearing object:

```bash
kubectl get rolebindings -n payments
kubectl get clusterrolebindings
kubectl describe rolebinding <binding-name> -n payments
kubectl describe clusterrole <role-name>
```

Check subject kind, name, namespace for ServiceAccounts, and case-sensitive group strings. OIDC group mapping or username prefixes can change the subject from what the human expects. `kubectl auth whoami` is stronger evidence than the display name in an identity-provider portal.

Grant only the missing verb on the required resource and scope. Avoid reflexively binding `cluster-admin`; it can conceal the diagnosis and creates lasting privilege escalation. After a change, repeat both `can-i` and the original operation.

## Recognize Non-RBAC 403 Responses

A 403 often reflects authorization, but the status alone does not prove an RBAC denial. Kubernetes can use multiple authorization mechanisms, including webhook authorization. Admission also runs after authorization and a policy webhook or built-in admission controller may reject an otherwise authorized create or update; the status message usually names the admission component or policy.

Use the response reason and audit event annotations to identify the stage. If `can-i` says `yes` but the operation is still rejected, compare the exact request attributes, then investigate admission policy or a fronting proxy. Do not broaden RBAC to work around an admission decision.

## Use Audit Evidence as the Tie-Breaker

Where auditing is enabled, correlate the timestamp, source address, verb, URI, response code, username, groups, and authorization annotations. An event with the expected user and a forbidden authorization decision confirms that authentication succeeded. No corresponding API server event suggests the request stopped at an earlier proxy or never reached that replica.

Keep audit policies proportional. Metadata-level records are often enough for access diagnosis; request bodies can contain Secrets and other sensitive data.

## Conclusion

Treat 401 and 403 as different stages. Repair token, certificate, plugin, issuer, audience, or clock problems for a 401. For a 403, prove the identity, reproduce the exact attributes with access reviews, and grant only the missing authorization. Let response bodies and audit records resolve anonymous access, proxies, webhooks, and admission edge cases.

## Official References

- [Kubernetes: Controlling Access to the API](https://kubernetes.io/docs/concepts/security/controlling-access/)
- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: kubectl auth](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
