# How to Supply a Custom CA to the CockroachDB Operator Without Breaking Readiness Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, TLS, Certificate Authority, Readiness Probes, PKI

Description: Configure custom node and root-client certificates for the legacy v1alpha1 Public Operator, preserve its exact secret contract, and diagnose secure readiness failures without weakening the probe.

---

A custom CA is not something the legacy CockroachDB Public Operator mounts by itself. The operator expects two complete TLS secrets: a node identity and a root client identity, both signed by the CA and both carrying the CA certificate under the exact key `ca.crt`. It projects and renames those keys into the filenames CockroachDB understands.

This guide is specifically for the deprecated `cockroachdb/cockroach-operator` and its `crdb.cockroachlabs.com/v1alpha1` `CrdbCluster`. The GA `v1beta1` CockroachDB Operator uses `spec.template.spec.certificates.externalCertificates` and the `cockroachdb-parent` chart's `cockroachdb.tls.externalCertificates` values. Do not paste `nodeTLSSecret` or `clientTLSSecret` into a `v1beta1` object.

## Understand the Public Operator's Secret Contract

For both custom secrets, the Public Operator expects these data keys:

| Kubernetes Secret key | Node secret meaning | Client secret meaning |
| --- | --- | --- |
| `tls.crt` | node leaf certificate | client certificate for SQL user `root` |
| `tls.key` | matching node private key | matching root-client private key |
| `ca.crt` | CA chain that signed the leaf | same trusted CA chain |

The operator maps node `tls.crt` and `tls.key` to `node.crt` and `node.key`, and maps client `tls.crt` and `tls.key` to `client.root.crt` and `client.root.key`. It copies projected files through an init container into `/cockroach/cockroach-certs/` with restrictive permissions.

Missing a key is therefore not a cosmetic error. It can leave the pod in `CreateContainerConfigError`, fail the init container, or prevent CockroachDB from loading a usable certificate directory.

## Issue Identities for the Actual Kubernetes Names

Use your organization's CA tooling if it can produce CockroachDB-compatible X.509 identities. The following `cockroach cert` example makes the naming requirements visible. Substitute the cluster name, namespace, and cluster domain used in your environment:

```bash
export CRDBCLUSTER=cockroachdb
export NAMESPACE=database

mkdir -p certs ca-key

cockroach cert create-ca \
  --certs-dir=certs \
  --ca-key=ca-key/ca.key

cockroach cert create-client root \
  --certs-dir=certs \
  --ca-key=ca-key/ca.key

cockroach cert create-node \
  localhost \
  127.0.0.1 \
  "$CRDBCLUSTER-public" \
  "$CRDBCLUSTER-public.$NAMESPACE" \
  "$CRDBCLUSTER-public.$NAMESPACE.svc.cluster.local" \
  "*.$CRDBCLUSTER" \
  "*.$CRDBCLUSTER.$NAMESPACE" \
  "*.$CRDBCLUSTER.$NAMESPACE.svc.cluster.local" \
  --certs-dir=certs \
  --ca-key=ca-key/ca.key
```

The node certificate's Common Name must be `node`; `cockroach cert create-node` sets it correctly. Its SAN set must cover the headless service, public service, and pod DNS names clients and nodes actually use. If this cluster will later migrate to the GA Operator, also include the three `<cluster>-join` DNS names required by the official migration prerequisites.

The root client certificate is not a server certificate. It represents SQL user `root`, so do not reuse the node leaf as the client identity. Keep the CA private key outside Kubernetes unless your approved issuer requires otherwise.

Create the secrets in the **database cluster's namespace** with the exact key names:

```bash
kubectl create secret generic crdb-node-custom-ca -n "$NAMESPACE" \
  --from-file=tls.crt=certs/node.crt \
  --from-file=tls.key=certs/node.key \
  --from-file=ca.crt=certs/ca.crt

kubectl create secret generic crdb-root-custom-ca -n "$NAMESPACE" \
  --from-file=tls.crt=certs/client.root.crt \
  --from-file=tls.key=certs/client.root.key \
  --from-file=ca.crt=certs/ca.crt
```

Reference them before initializing a new secure cluster:

```yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: database
spec:
  tlsEnabled: true
  nodeTLSSecret: crdb-node-custom-ca
  clientTLSSecret: crdb-root-custom-ca
  # Keep the rest of the existing supported spec here.
```

Changing a running cluster requires the certificate-rotation workflow, not an in-place guess. Create new, versioned secrets, update both references in the CR, and let the Public Operator roll pods one at a time. Its init container copies certificates at pod creation, so overwriting a referenced Secret alone does not update the working certificate directory in an already-running pod.

## Preflight the Secrets Before Applying the CR

Check the key set without printing private data:

```bash
for secret in crdb-node-custom-ca crdb-root-custom-ca; do
  kubectl get secret "$secret" -n "$NAMESPACE" \
    -o go-template='{{range $key,$value := .data}}{{$key}}{{"\n"}}{{end}}'
done
```

Extract into a restricted temporary directory for cryptographic checks:

```bash
workdir="$(mktemp -d)"
chmod 700 "$workdir"

kubectl get secret crdb-node-custom-ca -n "$NAMESPACE" \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > "$workdir/node.crt"
kubectl get secret crdb-node-custom-ca -n "$NAMESPACE" \
  -o jsonpath='{.data.tls\.key}' | base64 -d > "$workdir/node.key"
kubectl get secret crdb-node-custom-ca -n "$NAMESPACE" \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > "$workdir/ca.crt"

openssl verify -CAfile "$workdir/ca.crt" "$workdir/node.crt"
openssl x509 -in "$workdir/node.crt" -noout -subject -issuer -dates -ext subjectAltName

openssl x509 -in "$workdir/node.crt" -pubkey -noout \
  | openssl pkey -pubin -outform DER | openssl dgst -sha256
openssl pkey -in "$workdir/node.key" -pubout -outform DER \
  | openssl dgst -sha256
```

The last two digests must match. Repeat the chain and key-pair checks for the client secret. Also compare the SHA-256 digest of `ca.crt` from both Secrets; divergent trust bundles are a common source of node-to-node or client-to-node authentication failure.

## Interpret Readiness Correctly

For a TLS-enabled Public Operator cluster, the generated StatefulSet probes:

```text
HTTPS /health?ready=1 on the named HTTP port
```

It starts after 10 seconds, runs every 5 seconds, and marks the pod unready after two failures in the current source. Kubernetes HTTPS probes skip server-certificate verification, so the kubelet does **not** need your private CA installed in its host trust store. Replacing the probe with HTTP or importing your CA into every node will not fix a malformed CockroachDB certificate directory.

An HTTPS probe can still fail because CockroachDB never started, cannot read a key, cannot form a healthy cluster, or has not become ready. Diagnose the pod from the inside out:

```bash
kubectl describe pod "$CRDBCLUSTER-0" -n "$NAMESPACE"
kubectl logs "$CRDBCLUSTER-0" -n "$NAMESPACE" -c db-init
kubectl logs "$CRDBCLUSTER-0" -n "$NAMESPACE" -c db

kubectl exec "$CRDBCLUSTER-0" -n "$NAMESPACE" -c db -- \
  /cockroach/cockroach cert list --certs-dir=/cockroach/cockroach-certs/
```

Look for a failed volume projection, missing Secret key, private-key permission problem, expired certificate, wrong node identity, absent SAN, or a leaf signed by a CA not present in `ca.crt`. If the health endpoint answers but reports not ready, inspect CockroachDB node membership and under-replicated ranges rather than weakening TLS.

After all pods are Ready, verify a real SQL connection with the root client certificate and verify the live HTTPS certificate through the public Service. Readiness is necessary, but it does not prove that every external hostname is in the node certificate or that every application trusts the CA.

## GA Operator Equivalent

For a new `v1beta1` deployment, use exactly one GA chart certificate mode: self-signer, cert-manager, or external certificates. An external configuration names CA ConfigMaps and the node/client Secrets through `cockroachdb.tls.externalCertificates.certificates`. The chart rejects configurations with multiple modes enabled. That is a different API contract from the two legacy fields above.

## Official Documentation

- [CockroachDB certificate management for the Public Operator](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes)
- [Public Operator StatefulSet certificate projection and readiness probe source](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/resource/statefulset.go)
- [Public Operator custom TLS secret validation source](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/resource/tls_secret.go)
- [CockroachDB CLI certificate provisioning](https://www.cockroachlabs.com/docs/stable/manage-certs-cli)
- [GA CockroachDB chart certificate configuration](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/README.md)
- [Kubernetes HTTP probe behavior](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Conclusion

Supplying a custom CA to the Public Operator means supplying two correctly named, internally consistent identity bundles. Validate the chain, key pairs, CockroachDB identities, SANs, namespace, and exact Secret keys before rollout. The secure readiness probe does not validate your private CA; when it fails, preserve HTTPS and fix the certificate or cluster-health problem it exposed.
