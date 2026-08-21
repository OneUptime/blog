# How to Register a vCluster in Argo CD Without a Fragile Local Port-Forward

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Argo CD, GitOps, Kubernetes, TLS

Description: Register a vCluster as an Argo CD destination through a durable API endpoint instead of a workstation-bound port-forward.

---

`vcluster connect` can create a local port-forward or background proxy, which is convenient for interactive work but unsuitable as an Argo CD destination. If Argo CD stores `https://127.0.0.1:<random-port>` or `https://localhost:<random-port>` as the cluster server, that loopback address resolves inside the Argo CD component using it, not on the operator's workstation.

The durable pattern is to expose the tenant API at a hostname reachable from Argo CD, generate a token-based bootstrap kubeconfig whose `server` is that hostname, and let Argo CD install its manager identity in the tenant cluster and store that identity's token in Argo CD. This guide assumes vCluster **0.36** and Argo CD **3.5**. vCluster Platform users can instead use its Argo CD connector, which registers tenant clusters through the Platform proxy.

## Prerequisites

Before registration, verify these facts from the Argo CD network, not only from your laptop:

- The vCluster API has a stable Ingress, Gateway API `TLSRoute`, or LoadBalancer endpoint.
- For the `TLSRoute` example below, Gateway API v1.5 or later CRDs and a compatible controller are installed.
- Its certificate SAN contains the endpoint hostname.
- `argocd-server` and `argocd-application-controller` can resolve the hostname and reach TCP port 443.
- The kubeconfig contains the correct CA bundle and does not use `localhost`.
- The bootstrap identity running `argocd cluster add` can create ServiceAccounts, create and get token Secrets in `kube-system`, and create or update the manager RBAC resources. It must already hold the permissions being granted or be authorized to escalate each Role or ClusterRole and bind it to the ServiceAccount.
- The Argo CD account used by the CLI can create cluster registrations and, when using `--upsert`, update them.

For example, configure a Gateway-backed endpoint in `vcluster.yaml`:

```yaml
controlPlane:
  proxy:
    extraSANs:
      - api.team-a.example.com
  tlsRoute:
    enabled: true
    host: api.team-a.example.com
    parentRefs:
      - name: shared-tls
        namespace: gateways

exportKubeConfig:
  server: https://api.team-a.example.com
  context: team-a-vcluster
```

The `shared-tls` Gateway must have a `TLS` listener with `tls.mode: Passthrough`. Because the Route is in `team-a` and the Gateway is in `gateways`, that listener must also allow Routes from the `team-a` namespace; Gateway API allows only same-namespace Routes by default.

Apply it without starting a port-forward:

```bash
vcluster create team-a \
  --namespace team-a \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

Ingress is still an option for an established controller, but vCluster 0.36 recommends Gateway API for new API endpoints. Client-certificate kubeconfigs require TLS passthrough; a TLS-terminating Ingress should use token authentication and a CA bundle that trusts the Ingress certificate.

## Produce and Inspect the Registration Kubeconfig

Print a standalone kubeconfig that uses the durable URL:

```bash
vcluster connect team-a \
  --namespace team-a \
  --print \
  --server=https://api.team-a.example.com \
  --service-account=kube-system/argocd-manager \
  --cluster-role=cluster-admin \
  --token-expiration=3600 \
  > team-a-argocd.kubeconfig

kubectl --kubeconfig team-a-argocd.kubeconfig \
  config view --minify -o jsonpath='{.clusters[0].cluster.server}{"\n"}'

kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i create serviceaccounts -n kube-system
kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i create secrets -n kube-system
kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i get secrets -n kube-system
kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i create clusterroles.rbac.authorization.k8s.io
kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i create clusterrolebindings.rbac.authorization.k8s.io
kubectl --kubeconfig team-a-argocd.kubeconfig get --raw=/readyz
```

The service-account flags deliberately produce a token-only kubeconfig. Without them, vCluster's default kubeconfig contains an admin client certificate and key, which Argo CD 3.5 stores instead of the manager token it creates. vCluster may use a temporary local port-forward while minting the one-hour bootstrap token, but that tunnel closes when the command finishes and is not stored as the destination.

The server output must be the externally reachable URL. A successful `/readyz` proves transport, TLS validation, and API readiness; the `auth can-i` checks exercise the kubeconfig identity and authorization. Argo CD still needs the same DNS and network access from its own Pods.

If policy does not permit broad roles, have an administrator create a bootstrap ClusterRole with only the registration permissions and substitute its name for `cluster-admin`. Pass `--namespace` to `argocd cluster add` once for each permitted destination namespace so Argo CD creates namespace Roles and RoleBindings; pre-create those namespaces instead of using `CreateNamespace=true` unless the manager can create cluster-scoped Namespace resources and the registration also uses `--cluster-resources`. The default `cluster add` flow creates or reuses `argocd-manager` in `kube-system`, creates an admin-level ClusterRole and ClusterRoleBinding, and creates the `argocd-manager-long-lived-token` Secret. That is operationally simple, not least privilege.

## Register the vCluster

List the context in the dedicated file and pass it directly to the Argo CD CLI:

```bash
kubectl --kubeconfig team-a-argocd.kubeconfig \
  config get-contexts -o name

VCLUSTER_CONTEXT="$(kubectl --kubeconfig team-a-argocd.kubeconfig config current-context)"

argocd cluster add "$VCLUSTER_CONTEXT" \
  --kubeconfig team-a-argocd.kubeconfig \
  --name team-a-vcluster \
  --yes
```

`vcluster connect --print` rewrites the context name in its output, so capture `current-context` rather than assuming that it preserved `exportKubeConfig.context`. The `--name` flag controls the stable destination name stored by Argo CD. Do not run a background `vcluster connect` command around this step; the kubeconfig already contains the durable endpoint.

After `cluster add` succeeds, remove the temporary cluster-admin binding that vCluster created to bootstrap `argocd-manager`. The Argo CD-created `argocd-manager-role-binding` remains:

```bash
kubectl --kubeconfig team-a-argocd.kubeconfig \
  delete clusterrolebinding vcluster-sa-argocd-manager-kube-system
```

Confirm what Argo CD stored:

```bash
argocd cluster list
argocd cluster get team-a-vcluster
kubectl --kubeconfig team-a-argocd.kubeconfig \
  get serviceaccount/argocd-manager \
      secret/argocd-manager-long-lived-token \
  --namespace kube-system
kubectl --kubeconfig team-a-argocd.kubeconfig \
  get clusterrole/argocd-manager-role \
      clusterrolebinding/argocd-manager-role-binding
```

Deploy a small Application with `destination.name: team-a-vcluster` rather than copying the server URL into every manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: team-a-demo
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    name: team-a-vcluster
    namespace: demo
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

## Test from the Argo CD Runtime

A laptop test can conceal split DNS, egress policy, or a private CA unavailable to Argo CD. Registration tests connectivity from `argocd-server`, while ongoing reconciliation uses `argocd-application-controller`. The CLI reports registration failures; check the matching component logs for more detail:

```bash
kubectl logs -n argocd \
  -l app.kubernetes.io/name=argocd-server \
  --since=10m

kubectl logs -n argocd \
  -l app.kubernetes.io/name=argocd-application-controller \
  --since=10m
```

Interpret common errors in layers:

- `dial tcp`, timeout, or `no such host`: fix DNS, routing, firewall rules, or NetworkPolicy between Argo CD and the endpoint.
- `x509: certificate is valid for ...`: for TLS passthrough or a direct proxy endpoint, add the public hostname to `controlPlane.proxy.extraSANs` and regenerate the proxy certificate; for TLS termination, fix the terminating proxy's certificate.
- `certificate signed by unknown authority`: retain the CA data in the registration kubeconfig or configure the correct trust chain; do not default to insecure TLS.
- `Unauthorized`: inspect `argocd-manager-long-lived-token` and the Argo CD cluster Secret.
- `Forbidden`: authentication succeeded, but the manager Role or ClusterRole does not authorize the requested resource or namespace.

Rotate credentials deliberately. Regenerate the short-lived registration kubeconfig with the `vcluster connect` command above, delete `argocd-manager-long-lived-token`, re-run `argocd cluster add` with the captured context and `--upsert`, and remove the temporary bootstrap binding again. Test existing Applications before replacing a production credential.

## vCluster Platform Alternative

With vCluster Platform 4.11, create an Argo CD connector Secret in the Platform namespace, then enable it for the tenant cluster:

```yaml
integrations:
  argoCD:
    enabled: true
    connector: argocd-main
```

Platform registers the destination using its proxy and a scoped access key, avoiding manual imports. This is a different workflow from standalone `argocd cluster add`; choose one registration workflow to avoid duplicate destinations and conflicting lifecycle management.

## Official Documentation

- [vCluster: Access and expose vCluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster Platform: Connect to Argo CD](https://www.vcluster.com/docs/platform/integrations/argocd/connect-argocd)
- [Argo CD: Register a cluster](https://argo-cd.readthedocs.io/en/release-3.5/getting_started/#5-register-a-cluster-to-deploy-apps-to-optional)
- [Argo CD: Cluster management](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/)
- [Kubernetes: Service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)

## Conclusion

Argo CD needs a cluster endpoint that remains reachable after the operator's shell exits. Give the vCluster a stable, correctly certified URL, confirm the generated kubeconfig uses it, register that context, and troubleshoot connectivity from the Argo CD server and controller networks. Use the Platform connector instead when Platform should own registration lifecycle.
