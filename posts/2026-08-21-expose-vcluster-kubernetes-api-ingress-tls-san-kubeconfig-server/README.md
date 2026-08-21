# How to Expose the vCluster API Through Ingress with TLS and kubeconfig

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Ingress, TLS, kubeconfig

Description: Expose a vCluster API through an Ingress without certificate name errors, localhost kubeconfigs, or accidental TLS termination.

---

An Ingress can provide a stable endpoint for a vCluster Kubernetes API, but three pieces must agree: DNS must resolve the public hostname, the vCluster proxy certificate must contain that hostname as a Subject Alternative Name (SAN), and the kubeconfig must use the same URL. Creating only an externally managed Ingress resource usually leaves clients failing with an x509 error or still connecting to `localhost`.

This guide targets vCluster **0.36** with a container control plane on shared or private nodes. Ingress-based API exposure is still supported in this release, but vCluster recommends Gateway API `TLSRoute` for new deployments because ingress-nginx was retired upstream in March 2026. Use this guide when an existing Ingress controller is part of your supported platform.

## Understand the TLS Path

The safest Ingress design is TLS passthrough:

```text
kubectl -> api.dev.example.com:443 -> Ingress TCP/TLS passthrough
        -> vCluster Service:443 -> vCluster proxy terminates TLS
```

The vCluster proxy then presents its own certificate and can authenticate the client certificate from the normal admin kubeconfig. If the Ingress terminates TLS, client-certificate authentication does not pass through in the same way; use a service-account-token kubeconfig for that design and manage the edge certificate separately.

## Configure the Hostname, SAN, and Exported Server

Create `vcluster.yaml`:

```yaml
controlPlane:
  proxy:
    extraSANs:
      - api.dev.example.com
  ingress:
    enabled: true
    host: api.dev.example.com
    spec:
      ingressClassName: nginx
    annotations:
      nginx.ingress.kubernetes.io/backend-protocol: HTTPS
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"

exportKubeConfig:
  server: https://api.dev.example.com:443
  context: dev-vcluster
```

`controlPlane.proxy.extraSANs` explicitly includes the hostname in the certificate served by the vCluster proxy. In vCluster 0.36, `controlPlane.ingress.host` both creates the routing rule and is added to the proxy certificate automatically, so repeating the hostname in `extraSANs` is safe but redundant and makes the intended SAN explicit. `exportKubeConfig.server` changes the server in the generated kubeconfig Secret.

The annotations above are specific to ingress-nginx, and `ingressClassName` must match the class installed in your cluster. Its controller must also be started with `--enable-ssl-passthrough`; merely adding the annotation is insufficient. For Traefik, Emissary, or another controller, use that implementation's documented TLS-passthrough configuration.

Apply the configuration without opening a local connection:

```bash
vcluster create dev-vcluster \
  --namespace dev-vcluster \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

Point `api.dev.example.com` at the external address of the Ingress controller. Check both the rule and its backend:

```bash
kubectl get ingress -n dev-vcluster
kubectl describe ingress -n dev-vcluster
kubectl get service -n dev-vcluster dev-vcluster
```

If your release Service has a different name, use the name shown in the rendered Ingress rather than guessing it.

## Generate a Kubeconfig for the Public Endpoint

The CLI can print a fresh kubeconfig and explicitly override its server:

```bash
vcluster connect dev-vcluster \
  --namespace dev-vcluster \
  --print \
  --server=https://api.dev.example.com \
  > dev-vcluster.kubeconfig

kubectl --kubeconfig dev-vcluster.kubeconfig \
  config view --minify -o jsonpath='{.clusters[0].cluster.server}{"\n"}'

kubectl --kubeconfig dev-vcluster.kubeconfig get namespaces
```

Do not edit only the current context in a large shared kubeconfig. Producing a dedicated file makes the endpoint and credentials explicit and is easier to hand to automation.

You can also retrieve the chart-generated kubeconfig. By default it is stored in `vc-dev-vcluster` in the vCluster namespace:

```bash
kubectl get secret vc-dev-vcluster -n dev-vcluster \
  --template='{{.data.config}}' | base64 --decode \
  > dev-vcluster.kubeconfig
```

## Verify the Certificate Before Debugging Authentication

Inspect the certificate that the public path actually serves:

```bash
openssl s_client \
  -connect api.dev.example.com:443 \
  -servername api.dev.example.com \
  </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -ext subjectAltName
```

The SAN list must include `DNS:api.dev.example.com`. If the issuer is an edge CA instead of the vCluster CA, TLS is being terminated before it reaches vCluster, either by the controller or another edge proxy, rather than passed through end to end.

Useful failure signals are:

- `x509: certificate is valid for ... not api.dev.example.com`: neither `controlPlane.ingress.host` nor `extraSANs` includes the hostname, the vCluster was not upgraded, or a different certificate is being served.
- `certificate signed by unknown authority`: the kubeconfig lacks the correct CA data or TLS is being terminated by another certificate authority.
- `connection refused` or an HTTP 404: check DNS, the Ingress class, controller address, Service port, and passthrough support.
- `Unauthorized`: transport works; now inspect the kubeconfig credential. For TLS termination at the Ingress, generate a service-account kubeconfig rather than relying on a client certificate.

Avoid using `insecure-skip-tls-verify` as the permanent fix. It hides both a missing SAN and an unexpected certificate, which are exactly the conditions this setup is meant to detect.

## Official Documentation

- [vCluster: Access and expose vCluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster: Ingress control-plane configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/deployment/ingress)
- [vCluster: vcluster.yaml configuration reference](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml)
- [Kubernetes: Organizing cluster access using kubeconfig files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [ingress-nginx: TLS/HTTPS and SSL passthrough](https://kubernetes.github.io/ingress-nginx/user-guide/tls/)

## Conclusion

A reliable public vCluster endpoint is a three-way contract between the Ingress hostname, the proxy certificate SAN, and the kubeconfig server. Configure all three together, preserve end-to-end TLS when using client certificates, and verify the certificate presented over the real network path before troubleshooting Kubernetes authentication.
