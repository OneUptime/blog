# How to Configure Trust Across Federated Istio Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Security, mTLS, Certificates, Kubernetes

Description: Learn how to establish mutual trust between separate Istio meshes so services can communicate securely across federation boundaries.

---

When you federate two Istio meshes, each mesh typically has its own root certificate authority. That means services in mesh A don't trust certificates issued by mesh B, and vice versa. Without fixing this, mTLS connections between the meshes will fail with handshake errors.

There are a few ways to solve this problem. You can use a shared root CA, set up an intermediate CA hierarchy, or configure trust bundles manually. The right choice depends on your organization's security requirements and operational constraints.

## Understanding the Trust Problem

Each Istio installation generates its own self-signed root CA by default. When you install Istio on two separate clusters, you end up with two completely independent certificate chains.

Mesh A's root CA signs certificates for its workloads. Mesh B's root CA signs certificates for its workloads. When a service in mesh A tries to establish an mTLS connection with a service in mesh B, it can't verify the certificate because it doesn't know about mesh B's root CA.

You can check what root CA a mesh is using:

```bash
kubectl get secret cacerts -n istio-system --context=cluster-west -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

If this secret doesn't exist, Istio is using its auto-generated self-signed root.

## Option 1: Shared Root CA (Recommended for Federation)

The cleanest approach is to create a shared root CA and then derive intermediate CAs for each mesh. This way, both meshes trust the same root, but each mesh still has its own signing authority.

First, generate the shared root CA:

```bash
mkdir -p certs
cd certs

# Generate root CA key
openssl req -newkey rsa:4096 -nodes -keyout root-key.pem \
  -x509 -days 3650 -out root-cert.pem \
  -subj "/O=MyOrg/CN=Root CA"
```

Now create intermediate CAs for each mesh:

```bash
# Intermediate CA for mesh-west
openssl req -newkey rsa:4096 -nodes -keyout west-ca-key.pem \
  -out west-ca-csr.pem \
  -subj "/O=MyOrg/CN=West Intermediate CA"

openssl x509 -req -in west-ca-csr.pem -CA root-cert.pem \
  -CAkey root-key.pem -CAcreateserial \
  -out west-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

# Create the certificate chain
cat west-ca-cert.pem root-cert.pem > west-cert-chain.pem

# Intermediate CA for mesh-east
openssl req -newkey rsa:4096 -nodes -keyout east-ca-key.pem \
  -out east-ca-csr.pem \
  -subj "/O=MyOrg/CN=East Intermediate CA"

openssl x509 -req -in east-ca-csr.pem -CA root-cert.pem \
  -CAkey root-key.pem -CAcreateserial \
  -out east-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

cat east-ca-cert.pem root-cert.pem > east-cert-chain.pem
```

Now create the Kubernetes secrets in each cluster. Istio expects a secret called `cacerts` in the `istio-system` namespace:

```bash
# For cluster-west
kubectl create secret generic cacerts -n istio-system \
  --context=cluster-west \
  --from-file=ca-cert.pem=west-ca-cert.pem \
  --from-file=ca-key.pem=west-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=west-cert-chain.pem

# For cluster-east
kubectl create secret generic cacerts -n istio-system \
  --context=cluster-east \
  --from-file=ca-cert.pem=east-ca-cert.pem \
  --from-file=ca-key.pem=east-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=east-cert-chain.pem
```

Restart istiod on both clusters to pick up the new certificates:

```bash
kubectl rollout restart deployment/istiod -n istio-system --context=cluster-west
kubectl rollout restart deployment/istiod -n istio-system --context=cluster-east
```

After istiod restarts, it will start issuing workload certificates signed by the intermediate CA. Since both intermediate CAs chain back to the same root, workloads across meshes will trust each other.

## Option 2: Trust Bundle Distribution

If you can't use a shared root CA (maybe one mesh is managed by a different team that won't change their CA setup), you can distribute trust bundles instead. This means telling each mesh to trust the other mesh's root CA in addition to its own.

You do this through Istio's `MeshConfig`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    caCertificates:
      - pem: |
          -----BEGIN CERTIFICATE-----
          <other mesh's root CA certificate here>
          -----END CERTIFICATE-----
```

Apply this to each cluster with the other mesh's root certificate.

You can also use `PeerAuthentication` to configure trust at a more granular level:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: federation-trust
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

Setting `PERMISSIVE` mode temporarily can help during the trust migration, but you should switch back to `STRICT` once everything is working.

## Verifying Trust Configuration

After setting up trust, verify that the workload certificates chain back to the shared root:

```bash
# Get a workload's certificate chain
istioctl proxy-config secret \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  --context=cluster-west -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Check the issuer field. It should show your intermediate CA, and the chain should go back to your shared root.

You can also test the actual mTLS connection between meshes:

```bash
kubectl exec --context=cluster-west -n sample -c sleep \
  "$(kubectl get pod --context=cluster-west -n sample -l app=sleep \
  -o jsonpath='{.items[0].metadata.name}')" \
  -- curl -v helloworld.sample:5000/hello 2>&1 | grep "SSL"
```

## Rotating Certificates

Certificate rotation is something you need to plan for. Root CAs expire, intermediate CAs expire, and workload certificates expire (Istio rotates these automatically by default every 24 hours).

For intermediate CA rotation, you generate a new intermediate CA signed by the same root, update the `cacerts` secret, and restart istiod. The workloads will gradually pick up new certificates.

```bash
# Update the secret with new intermediate CA
kubectl create secret generic cacerts -n istio-system \
  --context=cluster-west \
  --from-file=ca-cert.pem=west-ca-cert-new.pem \
  --from-file=ca-key.pem=west-ca-key-new.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=west-cert-chain-new.pem \
  --dry-run=client -o yaml | kubectl apply --context=cluster-west -f -

kubectl rollout restart deployment/istiod -n istio-system --context=cluster-west
```

For root CA rotation, you need a longer transition period where both the old and new roots are trusted. Add both root certificates to the `cert-chain.pem` file during the rotation window.

## Common Mistakes

One thing that trips people up is forgetting to include the full chain in `cert-chain.pem`. This file should contain the intermediate cert followed by the root cert, in that order.

Another common issue is mismatched SPIFFE trust domains. If your meshes use different trust domains, you need to configure trust domain aliases:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomainAliases:
      - "cluster-east.local"
    trustDomain: "cluster-west.local"
```

This tells mesh-west to also accept SPIFFE identities from the cluster-east.local trust domain.

Getting trust right is the foundation of secure federation. Take the time to do it properly, because debugging mTLS failures across mesh boundaries is significantly harder than getting the setup right the first time.
