# How to Create SQL Users and Client Certificates in an Operator-Managed CockroachDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, TLS, Client Certificates, SQL Users, cert-manager

Description: Bootstrap SQL users with the GA CockroachDB Operator and issue separately managed client certificates whose identities and trust chain match the secure cluster.

---

A CockroachDB SQL user and a TLS client certificate are two different objects. The user is a SQL principal stored in CockroachDB. The certificate is a credential signed by the client certificate authority that the cluster trusts. Certificate authentication succeeds only when both exist and the certificate's mapped principal matches the SQL username.

The GA CockroachDB Operator can run one-time initialization SQL, while the chart provisions or consumes the `root` client credential needed for administrative reconciliation. Its public `crdb.cockroachlabs.com/v1beta1` API does not have a field that issues an arbitrary application user's certificate. Create the user through `postInitSQL` or a controlled SQL migration, then issue the application certificate through cert-manager or an external CA workflow.

This distinction matters because older examples for the public `v1alpha1` operator use a different custom-resource API. The paths in this guide are for the current GA operator and `cockroachdb-chart`.

## Start with a secure cluster

Enable TLS when the cluster is first created. The current chart warns that changing TLS mode on a running cluster can leave it unhealthy and unrecoverable. Choose one supported certificate provider for node and root credentials: the chart's self-signer, cert-manager, or externally supplied certificates.

The examples below assume:

- the `CrdbCluster` and application run in `crdb-prod`;
- the chart has `k8s.fullnameOverride: orders-db`, making the public Service `orders-db-public`;
- the cluster uses one shared node-and-client CA, published in ConfigMap `cockroachdb-ca`;
- an in-namespace cert-manager `Issuer` named `cockroachdb-client-ca` signs client credentials from that shared CA.

An `Issuer` is namespace-scoped, so it must be in `crdb-prod`. A `ClusterIssuer` can instead be referenced with `kind: ClusterIssuer`. Whichever issuer you select must sign from the same client CA that CockroachDB trusts. Merely creating a cert-manager `Certificate` does not update the database's trust configuration. The walkthrough uses a shared CA so the same public CA also verifies the CockroachDB server certificate.

## Bootstrap the SQL principal with `postInitSQL`

The database chart exposes `cockroachdb.crdbCluster.postInitSQL`. The operator runs it once after cluster initialization. TLS must be enabled, and the cluster's reconciliation mode must resolve to `MutableOnly`.

Add idempotent statements to the existing values file:

```yaml
k8s:
  fullnameOverride: orders-db

cockroachdb:
  tls:
    enabled: true
  crdbCluster:
    mode: MutableOnly
    postInitSQL:
      inline:
        - "CREATE DATABASE IF NOT EXISTS appdb"
        - "CREATE USER IF NOT EXISTS app_client"
        - "GRANT ALL ON DATABASE appdb TO app_client"
```

Keep the certificate-provider settings already used by the cluster; the abbreviated `tls` block above is not a request to replace them. Render the chart and confirm it produces `spec.postInitSQL` on the `v1beta1` resource:

```bash
helm template orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml \
  --show-only templates/crdb.yaml
```

The API can also read SQL from `secretRef` and `configMapRef`. When several sources are configured, the operator executes the Secret script first, then the ConfigMap script, then the inline list. If any statement fails, it reports `PostInitSQLApplied=False`; inspect that condition and the operator logs for the failure. A retry starts again at the first statement, so use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, or another deliberate idempotency strategy throughout the whole sequence.

Check the condition after installation:

```bash
kubectl -n crdb-prod get crdbcluster orders-db -o json \
  | jq '.status.conditions[]? | select(.type == "PostInitSQLApplied")'
```

`postInitSQL` is bootstrap functionality, not a general migration engine. Use a reviewed SQL migration process or an authenticated administrative session for users introduced after initialization, privilege changes, and application schema evolution.

## Issue a certificate for the exact SQL username

For ordinary certificate authentication, the certificate identity must map to the SQL principal. The straightforward convention is a certificate Common Name exactly equal to the username, including case: `app_client`.

When the cluster uses cert-manager, create a separate `Certificate` for the application user. The database chart currently creates a `root` client Certificate for its own administrative use; it does not generate this object for you.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-client
  namespace: crdb-prod
spec:
  secretName: app-client-tls
  commonName: app_client
  subject:
    organizations:
      - Cockroach
  duration: 672h
  renewBefore: 48h
  usages:
    - digital signature
    - key encipherment
    - client auth
  privateKey:
    algorithm: RSA
    size: 2048
  issuerRef:
    name: cockroachdb-client-ca
    kind: Issuer
    group: cert-manager.io
```

Apply it and wait for readiness:

```bash
kubectl apply -f app-client-certificate.yaml
kubectl -n crdb-prod wait certificate/app-client \
  --for=condition=Ready --timeout=2m
kubectl -n crdb-prod get secret app-client-tls
```

cert-manager stores the leaf certificate and private key as `tls.crt` and `tls.key`. Treat that Secret as the application user's login credential: restrict RBAC, avoid broad namespace-wide Secret reads, encrypt Kubernetes Secrets at rest, and do not copy the client CA's private key into the application namespace.

If the cluster uses one CA for node and client certificates, that CA is provided through `caConfigMapName`, as assumed here. With the less-recommended split-CA arrangement, the application certificate must be signed by the CA identified by `clientCaConfigMapName`, while the application's `sslrootcert` must contain the node/server CA identified by `nodeCaConfigMapName`. The first CA authenticates the client to CockroachDB; the second lets the client authenticate CockroachDB's node certificate. Publish and mount those as separate ConfigMaps instead of reusing the client CA in both directions. The operator's `rootSqlClientSecretName` is specifically the credential used for the `root` SQL user and administrative actions. Do not overwrite or reuse it for `app_client`.

## Mount files with names CockroachDB clients understand

CockroachDB's certificate-directory convention uses `ca.crt`, `client.<username>.crt`, and `client.<username>.key`. A projected Kubernetes volume can rename the cert-manager keys while taking the public CA certificate from the ConfigMap that defines cluster trust:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: crdb-prod
spec:
  template:
    spec:
      containers:
        - name: api
          image: registry.example.com/orders-api@sha256:REPLACE_WITH_DIGEST
          volumeMounts:
            - name: cockroach-client-certs
              mountPath: /var/run/cockroach-certs
              readOnly: true
      volumes:
        - name: cockroach-client-certs
          projected:
            defaultMode: 0400
            sources:
              - configMap:
                  name: cockroachdb-ca
                  items:
                    - key: ca.crt
                      path: ca.crt
              - secret:
                  name: app-client-tls
                  items:
                    - key: tls.crt
                      path: client.app_client.crt
                    - key: tls.key
                      path: client.app_client.key
```

Both source objects must exist in the pod's namespace. Do not assume a cert-manager Secret's optional `ca.crt` is present or is the configured trust anchor; mount the CA ConfigMap that the CockroachDB deployment actually uses.

Connect with hostname verification enabled:

```bash
cockroach sql \
  --url='postgresql://app_client@orders-db-public.crdb-prod.svc.cluster.local:26257/appdb?sslmode=verify-full&sslrootcert=/var/run/cockroach-certs/ca.crt&sslcert=/var/run/cockroach-certs/client.app_client.crt&sslkey=/var/run/cockroach-certs/client.app_client.key' \
  --execute='SELECT current_user, current_database()'
```

The host in the URL must be one of the node certificate's DNS names. The current database chart includes the namespace-qualified public Service name when it creates node certificates, provided the release namespace, `fullnameOverride`, and `clusterDomain` match the live deployment.

## Use an external CA when cert-manager is not the issuer

An offline or external client CA can issue the same identity. With CockroachDB's CLI, an authorized signing environment can run:

```bash
cockroach cert create-client app_client \
  --certs-dir=certs \
  --ca-key=/secure/client-ca.key
```

Distribute only `client.app_client.crt`, `client.app_client.key`, and the public CA certificate. Keep the CA key out of Kubernetes and application containers. If your PKI produces certificates itself, follow CockroachDB's documented client-certificate requirements and validate the resulting subject and chain before storing the leaf credential as a Secret.

Useful checks are:

```bash
openssl x509 -in client.app_client.crt -noout -subject -issuer -dates
openssl verify -CAfile ca.crt client.app_client.crt
kubectl -n crdb-prod describe certificate app-client
```

A valid chain alone is insufficient when its identity maps to the wrong user. Likewise, creating `app_client` in SQL does not make a certificate signed by an unrelated CA trusted.

## Plan rotation and revocation separately

cert-manager renews the Secret before expiry, but the application must observe the updated files or reconnect with a reloaded TLS configuration. Test that behavior before relying on automatic renewal.

The SQL principal and certificate also have separate lifecycles. Removing privileges or dropping/disabling the SQL user stops that identity from logging in even if a previously issued certificate has not expired. Rotating the certificate does not change SQL grants. For incident response, revoke or replace the credential according to your PKI and disable the SQL principal immediately; do not wait for operator reconciliation to manage an application certificate it did not issue.

## Official Documentation

- [CockroachDB: Secure the GA CockroachDB Operator deployment](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-operator)
- [CockroachDB chart: Post-init SQL requirements and ordering](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/README.md#post-init-sql)
- [CockroachDB GA `v1beta1` `PostInitSQL` API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB GA external-certificate API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB: Client authentication and certificate identities](https://www.cockroachlabs.com/docs/stable/authentication.html#client-authentication)
- [CockroachDB: Create and manage certificates with the CLI](https://www.cockroachlabs.com/docs/stable/manage-certs-cli)
- [cert-manager Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [Kubernetes projected volumes](https://kubernetes.io/docs/concepts/storage/projected-volumes/)

## Conclusion

Create the SQL principal with idempotent `postInitSQL` only during bootstrap, and manage later changes through a migration workflow. Issue a separate client certificate whose identity is `app_client` from the CA CockroachDB trusts, mount the exact leaf, key, and public CA files, and connect with `verify-full`. The GA operator manages its administrative `root` credential; application-user issuance, renewal consumption, privilege lifecycle, and incident response remain explicit platform responsibilities.
