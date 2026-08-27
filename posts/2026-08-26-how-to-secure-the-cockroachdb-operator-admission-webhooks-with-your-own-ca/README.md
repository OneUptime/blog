# How to Secure the CockroachDB Operator Admission Webhooks with Your Own CA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Admission Webhooks, TLS, Certificate Authority, OpenSSL

Description: Replace the legacy v1alpha1 Public Operator webhook CA safely, understand its generated serving certificate and caBundle updates, and verify the Kubernetes API server trust path.

---

The legacy CockroachDB Public Operator can use an organization-controlled CA for its admission webhooks, but the Secret it accepts is a **signing CA**, not a ready-made webhook server certificate. On each process start with webhook setup enabled, the operator reads that CA, generates a fresh serving leaf in memory, writes the leaf and key into its pod-local certificate directory, and patches both admission configurations with the CA certificate.

This guide applies to `cockroachdb/cockroach-operator`, the legacy `crdb.cockroachlabs.com/v1alpha1` controller, when webhook setup is enabled as it is in the standard upstream manifest. It does not apply to deployments started with `-skip-webhook-config`, including the OLM/OpenShift manifest, because that mode expects webhook TLS to be handled separately. The GA `v1beta1` CockroachDB Operator uses a different shared Secret named `cockroach-operator-certs` and the Helm value `selfSignedOperatorCerts`. Do not create the legacy Secret and assume the GA chart will consume it.

## Know What the Public Operator Generates

The legacy operator looks for `cockroach-operator-webhook-ca` in its own namespace. The Secret must contain:

- `tls.crt`: a PEM-encoded CA certificate;
- `tls.key`: the matching unencrypted, PEM-encoded PKCS#1 RSA CA private key.

If the Secret is missing, the operator creates its own CA. If it exists, the operator uses it to sign a new serving certificate with these DNS names:

```text
cockroach-operator-webhook-service
cockroach-operator-webhook-service.<namespace>
cockroach-operator-webhook-service.<namespace>.svc
cockroach-operator-webhook-service.<namespace>.svc.cluster.local
```

That leaf is not persisted as another Kubernetes Secret. A new one is created at every operator startup. The CA is then copied into `clientConfig.caBundle` for both:

```text
cockroach-operator-mutating-webhook-configuration
cockroach-operator-validating-webhook-configuration
```

This division is useful: you control CA custody and lifetime while the operator creates a pod-local serving identity with the exact Service SANs it knows.

## Create or Obtain a Dedicated CA

Prefer a dedicated intermediate or constrained CA issued through your organization's PKI. The Public Operator needs online access to its private key, so do not place an offline root key in the cluster.

For a lab or a controlled demonstration, OpenSSL can create a self-signed CA. Restrict the local key immediately:

```bash
umask 077
openssl genrsa -traditional -out webhook-ca.key 4096
openssl req -x509 -new -sha256 \
  -key webhook-ca.key \
  -days 3650 \
  -subj '/CN=CockroachDB Public Operator Webhook CA/O=Example Platform' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -out webhook-ca.crt

openssl verify -check_ss_sig -CAfile webhook-ca.crt webhook-ca.crt
openssl x509 -in webhook-ca.crt -noout -subject -issuer -serial -dates
head -n 1 webhook-ca.key
# Expected for this legacy operator: -----BEGIN RSA PRIVATE KEY-----
```

The `-traditional` option is intentional. The current legacy source requires an unencrypted PKCS#1 RSA CA key, while current OpenSSL can otherwise emit PKCS#8 (`BEGIN PRIVATE KEY`). The CA certificate does not need the webhook Service SANs; those belong on the generated serving leaf. Keep the validity period aligned with policy and alert well before expiration because the operator does not renew an externally supplied CA for you.

## Install the Secret Before First Startup

For a fresh install, create the namespace and then the Secret **before** starting the Public Operator Deployment:

```bash
export OPERATOR_NAMESPACE=cockroach-operator-system

kubectl create namespace "$OPERATOR_NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret tls cockroach-operator-webhook-ca \
  --cert=webhook-ca.crt \
  --key=webhook-ca.key \
  -n "$OPERATOR_NAMESPACE"
```

`kubectl create secret tls` writes the expected `tls.crt` and `tls.key` keys. Confirm type and keys without decoding the private key:

```bash
kubectl get secret cockroach-operator-webhook-ca \
  -n "$OPERATOR_NAMESPACE" \
  -o go-template='type={{.type}}{{"\n"}}{{range $key,$value := .data}}{{$key}}{{"\n"}}{{end}}'
```

Then install or start the Public Operator. Its startup sequence must be allowed to read the Secret, update both cluster-scoped webhook configurations, and bind port `9443` behind `cockroach-operator-webhook-service`.

For an already running Public Operator, apply the replacement Secret and restart the Deployment so it generates a serving leaf signed by the new CA:

```bash
kubectl create secret tls cockroach-operator-webhook-ca \
  --cert=webhook-ca.crt \
  --key=webhook-ca.key \
  -n "$OPERATOR_NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/cockroach-operator-manager \
  -n "$OPERATOR_NAMESPACE"
kubectl rollout status deployment/cockroach-operator-manager \
  -n "$OPERATOR_NAMESPACE"
```

The implementation reads the CA and generates the serving leaf only at startup; changing the Secret without restarting does not rotate the already loaded server certificate. Because the webhook configurations use `failurePolicy: Fail`, a CA change has an admission-risk window while the serving leaf and `caBundle` transition. Schedule it, stop unrelated `CrdbCluster` writes, and have a rollback copy of the old Secret. The legacy single-replica design does not provide a documented overlapping-CA, zero-downtime ceremony.

## Verify CA, Service, Leaf, and Admission as Separate Layers

First compare the configured CA bundle with the Secret. All three SHA-256 digests should match:

```bash
kubectl get secret cockroach-operator-webhook-ca \
  -n "$OPERATOR_NAMESPACE" \
  -o jsonpath='{.data.tls\.crt}' | base64 -d \
  | openssl dgst -sha256

kubectl get validatingwebhookconfiguration \
  cockroach-operator-validating-webhook-configuration \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d \
  | openssl dgst -sha256

kubectl get mutatingwebhookconfiguration \
  cockroach-operator-mutating-webhook-configuration \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d \
  | openssl dgst -sha256
```

Check the Service selector and its EndpointSlices:

```bash
kubectl get service cockroach-operator-webhook-service \
  -n "$OPERATOR_NAMESPACE" -o wide
kubectl get endpointslice \
  -n "$OPERATOR_NAMESPACE" \
  -l kubernetes.io/service-name=cockroach-operator-webhook-service
```

Port-forward the Service and validate its serving leaf with the same CA and the Service DNS name used by the API server. `-partial_chain` allows a dedicated intermediate CA to terminate verification when its issuing root is not included in the file:

```bash
kubectl get secret cockroach-operator-webhook-ca \
  -n "$OPERATOR_NAMESPACE" \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > webhook-ca-current.crt

kubectl port-forward service/cockroach-operator-webhook-service \
  9443:443 -n "$OPERATOR_NAMESPACE"
```

In another terminal:

```bash
openssl s_client \
  -connect 127.0.0.1:9443 \
  -servername "cockroach-operator-webhook-service.$OPERATOR_NAMESPACE.svc" \
  -verify_hostname "cockroach-operator-webhook-service.$OPERATOR_NAMESPACE.svc" \
  -CAfile webhook-ca-current.crt \
  -partial_chain \
  -verify_return_error </dev/null
```

Finally exercise the real control-plane path with a known-good legacy manifest:

```bash
kubectl apply --server-side --dry-run=server -f known-good-v1alpha1-crdbcluster.yaml
```

A successful local TLS test does not prove that a hosted control plane can reach the webhook Service. If server-side dry-run reports a timeout or connection refusal, inspect NetworkPolicies, control-plane-to-node firewall rules, Service endpoints, and operator logs. If it reports `x509: certificate signed by unknown authority`, compare the `caBundle`; if it reports a hostname error, inspect the live leaf SANs and Service namespace.

Do not set `failurePolicy: Ignore` as a permanent TLS fix. That bypasses the validation intended to protect `CrdbCluster` writes. If an incident requires a temporary bypass, treat it as a separate, approved emergency change and restore validation immediately after repairing the trust path.

## Do Not Blend This with the GA Operator

The current GA operator chart documents two managers for its shared `cockroach-operator-certs` Secret. With `selfSignedOperatorCerts: false`, Helm generates it and it changes on Helm upgrade; with `true`, the operator owns and persists it. Switching the flag requires deleting the conflicting Secret as directed by the chart. Those names and lifecycle rules are not compatible with this Public Operator runbook.

## Official Documentation

- [CockroachDB Public Operator webhook certificate management](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes#secure-the-webhooks)
- [Public Operator webhook certificate source](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/resource/webhook_certificates.go)
- [Public Operator webhook startup source](https://github.com/cockroachdb/cockroach-operator/blob/master/cmd/cockroach-operator/prep_webhooks.go)
- [Kubernetes dynamic admission control and caBundle](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [OpenSSL req documentation](https://docs.openssl.org/3.5/man1/openssl-req/)
- [GA Operator webhook certificate modes](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#operator-tls-certificates-selfsignedoperatorcerts)

## Conclusion

For the Public Operator, install a dedicated signing CA under the exact legacy Secret name, restart the controller to mint a new Service-bound leaf, and verify both webhook `caBundle` fields plus a real API-server admission request. Treat CA replacement as a coordinated availability change, and use the separate GA certificate model after migration.
