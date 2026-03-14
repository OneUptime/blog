# How to Handle Cross-Cluster Certificate Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, Multi-Cluster, Security, mTLS

Description: A complete guide to managing TLS certificates across multiple Istio clusters for secure cross-cluster communication.

---

Cross-cluster communication in Istio relies entirely on mTLS. If the certificates are wrong, expired, or do not share a common trust root, nothing works. Services in cluster A will refuse to talk to services in cluster B, and the error messages are often cryptic enough to send you down the wrong debugging path for hours.

Getting certificate management right across clusters is one of the most important things you can do for a multi-cluster Istio deployment. This guide covers how to set it up properly and keep it running.

## How Istio Certificates Work

Istio uses a certificate authority (CA) to issue certificates to every sidecar proxy. When two proxies communicate, they present their certificates and verify them against the CA. In a single cluster, this just works because there is one CA (istiod) and it signs everything.

In a multi-cluster setup, each cluster has its own istiod, which means each cluster has its own CA. For cross-cluster mTLS to work, these CAs must share a common root certificate. Istio calls this a "plug-in CA" setup.

## Setting Up a Shared Root CA

The first step is creating a root CA that both clusters will trust.

Generate the root certificate and key:

```bash
mkdir -p certs
cd certs

# Generate root CA key
openssl genrsa -out root-key.pem 4096

# Generate root certificate
openssl req -new -x509 -key root-key.pem -out root-cert.pem \
  -days 3650 -subj "/O=my-org/CN=root-ca"
```

Now create intermediate CAs for each cluster. Each cluster should have its own intermediate CA signed by the shared root:

```bash
# Cluster A intermediate CA
openssl genrsa -out cluster-a-ca-key.pem 4096
openssl req -new -key cluster-a-ca-key.pem -out cluster-a-ca-csr.pem \
  -subj "/O=my-org/CN=cluster-a-intermediate"
openssl x509 -req -in cluster-a-ca-csr.pem -CA root-cert.pem \
  -CAkey root-key.pem -CAcreateserial \
  -out cluster-a-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

# Create the cert chain for cluster A
cat cluster-a-ca-cert.pem root-cert.pem > cluster-a-cert-chain.pem

# Cluster B intermediate CA
openssl genrsa -out cluster-b-ca-key.pem 4096
openssl req -new -key cluster-b-ca-key.pem -out cluster-b-ca-csr.pem \
  -subj "/O=my-org/CN=cluster-b-intermediate"
openssl x509 -req -in cluster-b-ca-csr.pem -CA root-cert.pem \
  -CAkey root-key.pem -CAcreateserial \
  -out cluster-b-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

# Create the cert chain for cluster B
cat cluster-b-ca-cert.pem root-cert.pem > cluster-b-cert-chain.pem
```

## Installing Certificates in Each Cluster

Create the `cacerts` secret in the `istio-system` namespace of each cluster. Istio looks for this specific secret name to use plug-in certificates.

For cluster A:

```bash
kubectl create namespace istio-system --context=cluster-a

kubectl create secret generic cacerts -n istio-system --context=cluster-a \
  --from-file=ca-cert.pem=cluster-a-ca-cert.pem \
  --from-file=ca-key.pem=cluster-a-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster-a-cert-chain.pem
```

For cluster B:

```bash
kubectl create namespace istio-system --context=cluster-b

kubectl create secret generic cacerts -n istio-system --context=cluster-b \
  --from-file=ca-cert.pem=cluster-b-ca-cert.pem \
  --from-file=ca-key.pem=cluster-b-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster-b-cert-chain.pem
```

After creating the secrets, install or restart Istio so it picks them up:

```bash
istioctl install --context=cluster-a \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network-a

istioctl install --context=cluster-b \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-b \
  --set values.global.network=network-b
```

## Using cert-manager for Automated Certificate Management

Manually managing certificates is fine for small setups, but for production you want automation. cert-manager can handle certificate rotation and renewal.

Install cert-manager in each cluster:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml --context=cluster-a
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml --context=cluster-b
```

Create a ClusterIssuer that uses your root CA:

```yaml
apiVersion: cert-manager.io/v1
kind: Secret
metadata:
  name: root-ca-secret
  namespace: cert-manager
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-root-cert>
  tls.key: <base64-encoded-root-key>
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: root-ca-secret
```

Configure istio-csr to bridge cert-manager and Istio:

```bash
helm install istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.tls.rootCACertFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.server.clusterID=cluster-a" \
  --set "app.certmanager.issuerRef.name=istio-ca" \
  --set "app.certmanager.issuerRef.kind=ClusterIssuer" \
  --kube-context=cluster-a
```

Then install Istio to use the external CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  components:
    pilot:
      k8s:
        env:
        - name: ENABLE_CA_SERVER
          value: "false"
```

## Verifying Certificate Trust

After setting everything up, verify that certificates are correct and trusted across clusters.

**Check the root certificate is the same:**

```bash
# Cluster A
kubectl exec deploy/sleep -c istio-proxy --context=cluster-a -- \
  openssl x509 -in /var/run/secrets/istio/root-cert.pem -text -noout | grep "Issuer\|Subject"

# Cluster B
kubectl exec deploy/sleep -c istio-proxy --context=cluster-b -- \
  openssl x509 -in /var/run/secrets/istio/root-cert.pem -text -noout | grep "Issuer\|Subject"
```

**Verify the certificate chain:**

```bash
istioctl proxy-config secret deploy/sleep --context=cluster-a -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | head -20
```

**Test cross-cluster mTLS:**

```bash
kubectl exec deploy/sleep -c sleep --context=cluster-a -- \
  curl -s payment.default.svc.cluster.local:8080/health
```

If you get a response, mTLS is working across clusters. If you get a connection error, check the proxy logs:

```bash
kubectl logs deploy/sleep -c istio-proxy --context=cluster-a | grep -i "tls\|ssl\|cert"
```

## Certificate Rotation

Certificates expire, and you need a plan for rotating them before that happens.

**Checking certificate expiration:**

```bash
istioctl proxy-config secret deploy/sleep --context=cluster-a -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -enddate -noout
```

**Rotating the intermediate CA:**

When you need to rotate the intermediate CA for a cluster, generate a new intermediate cert signed by the same root, update the `cacerts` secret, and restart istiod:

```bash
# Generate new intermediate
openssl genrsa -out cluster-a-ca-key-new.pem 4096
openssl req -new -key cluster-a-ca-key-new.pem -out cluster-a-ca-csr-new.pem \
  -subj "/O=my-org/CN=cluster-a-intermediate-v2"
openssl x509 -req -in cluster-a-ca-csr-new.pem -CA root-cert.pem \
  -CAkey root-key.pem -CAcreateserial \
  -out cluster-a-ca-cert-new.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

cat cluster-a-ca-cert-new.pem root-cert.pem > cluster-a-cert-chain-new.pem

# Update the secret
kubectl create secret generic cacerts -n istio-system --context=cluster-a \
  --from-file=ca-cert.pem=cluster-a-ca-cert-new.pem \
  --from-file=ca-key.pem=cluster-a-ca-key-new.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster-a-cert-chain-new.pem \
  --dry-run=client -o yaml | kubectl apply -f - --context=cluster-a

# Restart istiod to pick up new certs
kubectl rollout restart deployment istiod -n istio-system --context=cluster-a
```

Workload certificates will be automatically renewed as they expire, using the new intermediate CA.

## Secure the Root Key

The root CA private key is the most sensitive piece of your entire multi-cluster setup. If someone gets it, they can impersonate any service in any cluster.

- Store the root key in a hardware security module (HSM) or a secrets manager like HashiCorp Vault.
- Never store it in a Kubernetes secret or on a developer's laptop.
- Use it only when you need to sign new intermediate certificates.
- Consider using an offline root CA that is physically disconnected from the network.

Certificate management across multiple Istio clusters requires upfront planning, but once you have the shared root CA in place and automated rotation with cert-manager, it runs itself with minimal ongoing effort.
