# How to Configure Flux Proxy Secret for HTTPS Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secret, Proxy, HTTPS Proxy, TLS, Networking

Description: A practical guide to routing Flux CD source controller traffic through an HTTPS proxy with TLS termination and certificate configuration.

---

## Introduction

Some enterprise networks use HTTPS proxies for outbound traffic. These proxies accept encrypted connections from clients and may also perform TLS inspection. Configuring Flux CD to work with an HTTPS proxy requires creating a proxy secret with the correct address scheme. This guide covers the full setup.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- The HTTPS proxy URL (e.g., `https://proxy.corp.example.com:3129`)
- The proxy CA certificate if the proxy uses a self-signed or internal CA
- Optional: proxy authentication credentials

## How HTTPS Proxies Work with Flux

When you configure Flux with an HTTPS proxy, the source controller establishes a TLS connection to the proxy itself, then issues a CONNECT request to reach the target server. This differs from an HTTP proxy where the initial connection to the proxy is unencrypted. The proxy address in the Flux secret must start with `https://`.

## Step 1: Create the HTTPS Proxy Secret

Create a secret with the HTTPS proxy address:

```bash
kubectl create secret generic flux-https-proxy \
  --namespace=flux-system \
  --from-literal=address=https://proxy.corp.example.com:3129
```

With authentication credentials:

```bash
kubectl create secret generic flux-https-proxy \
  --namespace=flux-system \
  --from-literal=address=https://proxy.corp.example.com:3129 \
  --from-literal=username=proxyuser \
  --from-literal=password=proxypassword
```

## Step 2: Add TLS Trust When Needed

Flux proxy secrets support the `address`, `username`, and `password` keys. Do not put CA certificate data in the proxy secret. If your proxy performs TLS inspection or your Git server uses a certificate signed by an internal or self-signed CA, provide that CA certificate through the source's TLS or authentication secret.

```bash
kubectl create secret generic tls-inspection-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./proxy-ca.crt
```

## Step 3: Declarative YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-https-proxy
  namespace: flux-system
type: Opaque
stringData:
  address: "https://proxy.corp.example.com:3129"
  username: "proxyuser"
  password: "proxypassword"
```

Apply it:

```bash
kubectl apply -f flux-https-proxy-secret.yaml
```

## Step 4: Reference the Proxy in GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app.git
  ref:
    branch: main
  proxySecretRef:
    name: flux-https-proxy
  secretRef:
    name: tls-inspection-ca
```

## Step 5: Reference the Proxy in OCIRepository

HelmRepository (type `default`) does not support `proxySecretRef`. If you need proxy support for Helm charts, use an OCIRepository source instead:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 30m
  url: oci://ghcr.io/my-org/charts/ingress-nginx
  ref:
    tag: latest
  proxySecretRef:
    name: flux-https-proxy
```

## Step 6: Apply and Verify

```bash
# Apply your resources

kubectl apply -f git-repository.yaml
kubectl apply -f oci-repository.yaml

# Check status
flux get sources git
flux get sources oci

# Force reconciliation
flux reconcile source git my-app

# Check events for errors
kubectl events -n flux-system --for gitrepository/my-app
```

## Handling TLS Inspection Proxies

Some HTTPS proxies perform TLS inspection (man-in-the-middle) by re-signing certificates with an internal CA. In this scenario, the upstream server certificates will appear to be signed by your proxy CA. You need to provide the proxy CA in the `secretRef` secret (using the `ca.crt` key) so the source controller trusts the re-signed certificates.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app.git
  ref:
    branch: main
  proxySecretRef:
    name: flux-https-proxy
  secretRef:
    name: tls-inspection-ca
```

Create the secret containing the CA certificate and any authentication credentials:

```bash
kubectl create secret generic tls-inspection-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./proxy-inspection-ca.crt
```

Note: GitRepository does not have a `certSecretRef` field. TLS certificates (`ca.crt`, `tls.crt`, `tls.key`) are placed in the secret referenced by `secretRef`.

## Troubleshooting

### TLS Handshake Errors

If you see `x509: certificate signed by unknown authority`, the CA certificate is missing from the source TLS/authentication secret or from the source controller's trusted CA bundle:

```bash
# Verify the CA file is in the GitRepository secretRef secret
kubectl get secret tls-inspection-ca -n flux-system -o jsonpath='{.data.ca\.crt}' | base64 -d
```

### Connection Refused

Ensure the proxy port supports HTTPS connections, not just HTTP:

```bash
kubectl run tls-test --rm -it --image=curlimages/curl -- \
  curl -v --proxy https://proxy.corp.example.com:3129 https://github.com
```

### Source Controller Logs

```bash
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i "proxy\|tls\|x509"
```

## HTTPS Proxy vs HTTP Proxy

| Feature | HTTP Proxy | HTTPS Proxy |
|---------|-----------|-------------|
| Proxy connection | Unencrypted | TLS encrypted |
| Address scheme | `http://` | `https://` |
| CA certificate needed | No for the proxy connection | Yes for the proxy connection if the proxy uses an internal CA |
| Traffic visibility for HTTPS targets | Proxy sees CONNECT metadata and an encrypted tunnel unless it performs TLS inspection | Proxy sees CONNECT metadata and an encrypted tunnel unless it performs TLS inspection |

Choose HTTPS proxy when you need encrypted communication between the source controller pod and the proxy server.

## Conclusion

Configuring Flux to use an HTTPS proxy involves creating a proxy secret with the `https://` address scheme and adding CA trust through the relevant source TLS or authentication secret when TLS inspection or private CAs are involved. This setup ensures secure communication between the Flux source controller and your proxy while maintaining access to external Git and Helm repositories.
