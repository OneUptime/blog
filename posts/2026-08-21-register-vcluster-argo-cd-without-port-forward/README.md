# How to Register a vCluster in Argo CD Without a Fragile Local Port-Forward

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Argo CD, GitOps, Kubernetes, TLS

Description: Register a vCluster as an Argo CD destination through a durable API endpoint instead of a workstation-bound port-forward.

---

`vcluster connect` can create a local port-forward, which is convenient for interactive work but unsuitable as an Argo CD destination. If Argo CD stores `https://127.0.0.1:<random-port>` as the cluster server, that address refers to the Argo CD controller Pod itself after the workstation command exits.

The durable pattern is to expose the tenant API at a hostname reachable from Argo CD, generate a kubeconfig whose `server` is that hostname, and let Argo CD create a service account in the tenant cluster. This guide assumes vCluster **0.36** and a current Argo CD release. vCluster Platform users can instead use its Argo CD connector, which registers tenant clusters through the Platform proxy.

## Prerequisites

Before registration, verify these facts from the Argo CD network, not only from your laptop:

- The vCluster API has a stable Ingress, Gateway API `TLSRoute`, or LoadBalancer endpoint.
- Its certificate SAN contains the endpoint hostname.
- Argo CD's application controller can resolve the hostname and reach TCP port 443.
- The kubeconfig contains the correct CA bundle and does not use `localhost`.
- The identity running `argocd cluster add` can create a ServiceAccount, ClusterRole, and ClusterRoleBinding in the tenant cluster.

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

Apply it without starting a port-forward:

```bash
vcluster create team-a \
  --namespace team-a \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

Ingress is still an option for an established controller, but vCluster 0.36 recommends Gateway API for new API endpoints.

## Produce and Inspect the Registration Kubeconfig

Print a standalone kubeconfig that uses the durable URL:

```bash
vcluster connect team-a \
  --namespace team-a \
  --print \
  --server=https://api.team-a.example.com \
  > team-a-argocd.kubeconfig

kubectl --kubeconfig team-a-argocd.kubeconfig \
  config view --minify -o jsonpath='{.clusters[0].cluster.server}{"\n"}'

kubectl --kubeconfig team-a-argocd.kubeconfig auth can-i create serviceaccounts -n kube-system
kubectl --kubeconfig team-a-argocd.kubeconfig get --raw=/readyz
```

The server output must be the externally reachable URL. A successful `/readyz` proves transport and authentication, but Argo CD still needs the same DNS and network access from its own namespace.

If policy does not permit Argo CD's default broad role, prepare a namespace-scoped role appropriate for the Applications you deploy. Argo CD's default `cluster add` flow creates `argocd-manager` in `kube-system` and binds it to an admin-level ClusterRole; that is operationally simple, not least privilege.

## Register the vCluster

List the context in the dedicated file and pass it directly to the Argo CD CLI:

```bash
kubectl --kubeconfig team-a-argocd.kubeconfig \
  config get-contexts -o name

argocd cluster add team-a-vcluster \
  --kubeconfig team-a-argocd.kubeconfig \
  --name team-a-vcluster \
  --yes
```

If the printed context has a different name, use that exact value. Do not run a background `vcluster connect` command around this step; the kubeconfig already contains the durable endpoint.

Confirm what Argo CD stored:

```bash
argocd cluster list
argocd cluster get team-a-vcluster
kubectl --kubeconfig team-a-argocd.kubeconfig \
  get serviceaccount,clusterrole,clusterrolebinding -A \
  | grep argocd-manager
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
    repoURL: https://github.com/example/platform-config.git
    targetRevision: main
    path: apps/demo
  destination:
    name: team-a-vcluster
    namespace: demo
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

## Test from the Argo CD Runtime

A laptop test can conceal split DNS, egress policy, or a private CA unavailable to Argo CD. Check the application-controller logs for the exact failure:

```bash
kubectl logs -n argocd \
  -l app.kubernetes.io/name=argocd-application-controller \
  --since=10m
```

Interpret common errors in layers:

- `dial tcp`, timeout, or `no such host`: fix DNS, routing, firewall rules, or NetworkPolicy between Argo CD and the endpoint.
- `x509: certificate is valid for ...`: add the public hostname to `controlPlane.proxy.extraSANs` and regenerate the endpoint certificate.
- `certificate signed by unknown authority`: retain the CA data in the registration kubeconfig or configure the correct trust chain; do not default to insecure TLS.
- `Unauthorized`: inspect the `argocd-manager` token and cluster Secret.
- `Forbidden`: authentication succeeded, but the manager Role does not authorize the requested resource or namespace.

Rotate credentials deliberately. Re-running `argocd cluster add` with `--upsert` can update registration, but review the CLI's proposed changes and test existing Applications before replacing a production credential.

## vCluster Platform Alternative

With vCluster Platform 4.11, create an Argo CD connector Secret in the Platform namespace, then enable it for the tenant cluster:

```yaml
integrations:
  argoCD:
    enabled: true
    connector: argocd-main
```

Platform registers the destination using its proxy and a scoped access key, avoiding manual imports. This is a different workflow from standalone `argocd cluster add`; choose one registration owner so two systems do not continually replace the same cluster entry.

## Official Documentation

- [vCluster: Access and expose vCluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster Platform: Connect to Argo CD](https://www.vcluster.com/docs/platform/integrations/argocd/connect-argocd)
- [Argo CD: Register a cluster](https://argo-cd.readthedocs.io/en/latest/getting_started/#5-register-a-cluster-to-deploy-apps-to-optional)
- [Argo CD: Cluster management](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/)
- [Kubernetes: Service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)

## Conclusion

Argo CD needs a cluster endpoint that remains reachable after the operator's shell exits. Give the vCluster a stable, correctly certified URL, confirm the generated kubeconfig uses it, register that context, and troubleshoot connectivity from the Argo CD controller's network. Use the Platform connector instead when Platform should own registration lifecycle.
