# How to Handle Secret Management in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Secret, Security, Kubernetes, Certificate Management

Description: Learn how to properly manage secrets in Istio including TLS certificates, CA keys, and integration with external secret stores.

---

Secret management in Istio is one of those things that seems simple on the surface but has a lot of depth once you start peeling back the layers. Istio deals with several types of secrets - TLS certificates for mTLS, gateway certificates for ingress traffic, CA signing keys, and sometimes application-level secrets that flow through the mesh. Getting this right is critical for production deployments.

## How Istio Handles Secrets by Default

When you install Istio, it creates a self-signed root CA certificate and stores it as a Kubernetes secret in the istio-system namespace. The istiod control plane uses this CA to issue workload certificates to each sidecar proxy via the SDS (Secret Discovery Service) API.

You can check what secrets Istio has created:

```bash
kubectl get secrets -n istio-system
```

You will typically see `istio-ca-secret` which contains the root CA certificate and key. This is the most sensitive secret in your entire mesh because whoever controls this CA can mint certificates for any workload.

## Bringing Your Own CA Certificate

For production, you should never rely on the auto-generated self-signed CA. Instead, plug in your own CA certificate, ideally one signed by your organization's PKI.

Create a secret with your CA materials:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

The files you need are:

- `ca-cert.pem` - The intermediate CA certificate that Istio will use to sign workload certs
- `ca-key.pem` - The private key for the intermediate CA
- `root-cert.pem` - The root CA certificate
- `cert-chain.pem` - The full certificate chain from intermediate to root

After creating this secret, restart istiod to pick it up:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

## Rotating the CA Certificate

Certificate rotation is something you need to plan for. Istio supports CA certificate rotation without downtime, but you need to do it carefully.

The approach is to create a new CA certificate signed by the same root, update the secret, and let istiod gradually issue new workload certificates:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Then restart istiod:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

Workload certificates will be refreshed automatically as they expire. The default workload certificate TTL is 24 hours, so within a day all workloads will have certificates signed by the new CA.

## Managing Gateway TLS Certificates

For Istio ingress gateways, you need TLS certificates for your external-facing domains. These are stored as Kubernetes secrets:

```bash
kubectl create secret tls my-app-credential \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

Then reference it in your Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-app-credential
    hosts:
    - "app.example.com"
```

The `credentialName` field tells the gateway to fetch the TLS secret via SDS rather than mounting it as a file. This is important because it means you can update the certificate without restarting the gateway pod.

## Integrating with cert-manager

Manually managing certificates is error-prone. Use cert-manager to automate certificate lifecycle:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: istio-system
spec:
  secretName: my-app-credential
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - "app.example.com"
  - "api.example.com"
```

cert-manager will automatically create and renew the Kubernetes secret that the Istio gateway references. No manual intervention needed.

## Using External Secret Stores

For organizations with strict security requirements, storing secrets in Kubernetes etcd might not be acceptable. You can integrate with external secret stores using the External Secrets Operator.

First, install the External Secrets Operator, then create an ExternalSecret that pulls from AWS Secrets Manager, HashiCorp Vault, or similar:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: istio-ca-external
  namespace: istio-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: cacerts
    creationPolicy: Owner
  data:
  - secretKey: ca-cert.pem
    remoteRef:
      key: istio/ca-cert
  - secretKey: ca-key.pem
    remoteRef:
      key: istio/ca-key
  - secretKey: root-cert.pem
    remoteRef:
      key: istio/root-cert
  - secretKey: cert-chain.pem
    remoteRef:
      key: istio/cert-chain
```

This pulls the CA materials from Vault and creates the `cacerts` secret that Istio expects. The `refreshInterval` handles automatic rotation.

## Securing the CA Private Key

The CA private key is the crown jewel. Here are some practices to protect it:

1. Use Kubernetes RBAC to restrict who can read secrets in the istio-system namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-secret-reader
  namespace: istio-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["cacerts"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: istiod-secret-reader
  namespace: istio-system
subjects:
- kind: ServiceAccount
  name: istiod
  namespace: istio-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: istio-secret-reader
```

2. Enable etcd encryption at rest in your Kubernetes cluster so secrets are not stored in plain text.

3. Consider using an intermediate CA rather than your root CA. If the intermediate is compromised, you can revoke it without replacing your entire PKI.

## Workload Certificate Configuration

You can tune how workload certificates are issued through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
```

Or configure certificate properties through Envoy proxy settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tls-settings
spec:
  host: "*.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Auditing Secret Access

Keep an eye on who is accessing your secrets. Enable Kubernetes audit logging for secret access:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  namespaces: ["istio-system"]
```

This logs every time someone reads or modifies secrets in the istio-system namespace.

## Troubleshooting Secret Issues

When things go wrong with secrets, here is how to debug:

Check if istiod can read the CA secret:

```bash
kubectl logs deployment/istiod -n istio-system | grep -i "ca\|cert\|secret"
```

Verify workload certificates are being issued:

```bash
istioctl proxy-config secret <pod-name> -n <namespace>
```

Check the certificate chain of a specific workload:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Secret management in Istio is all about layering the right controls. Start with bringing your own CA, automate certificate lifecycle with cert-manager, integrate external secret stores if your security posture demands it, and always audit access. Get these fundamentals right and you will have a solid security foundation for your mesh.
