# How to Expose CockroachDB SQL and the DB Console Through Separate Ingresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Ingress, LoadBalancer, PostgreSQL, TLS

Description: Expose the DB Console through HTTP Ingress and CockroachDB SQL through an independent raw-TCP entry point for a GA v1beta1 Operator deployment.

---

CockroachDB exposes two very different application protocols:

- the DB Console is HTTP or HTTPS, normally on port 8080;
- SQL uses the PostgreSQL wire protocol over TCP, normally on port 26257.

They should not be sent through two ordinary Kubernetes `Ingress` objects. The Kubernetes Ingress API routes HTTP and HTTPS only; it does not expose arbitrary TCP protocols. Cockroach Labs also warns that PostgreSQL's TLS negotiation order is incompatible with SNI-based Kubernetes ingress routing and recommends a dedicated TCP load balancer that is not shared with other services.

In this guide, "separate ingresses" means separate external paths: a standard HTTP Ingress for the DB Console and a dedicated layer-4 listener for SQL. The SQL path can be a `LoadBalancer` Service or an ingress controller's explicitly supported TCP-stream feature. It is not a portable `networking.k8s.io/v1` Ingress.

This guide uses the GA Operator's `crdb.cockroachlabs.com/v1beta1` deployment chart. The public operator and older Helm chart are legacy and use different values and labels.

## Give the Internal Service a Predictable Name

The current CockroachDB subchart creates a public client Service with gRPC, SQL, and HTTP named ports. Keep it internal and disable the chart-generated Ingress objects so the two paths can be reviewed separately:

```yaml
# cockroachdb-values.yaml
k8s:
  fullnameOverride: cockroachdb

cockroachdb:
  tls:
    enabled: true
    selfSigner:
      enabled: true
      additionalSANs:
        - sql.example.com
  crdbCluster:
    service:
      ports:
        grpc:
          name: grpc
          port: 26258
        sql:
          name: sql
          port: 26257
        http:
          name: http
          port: 8080
      public:
        name: cockroachdb-public
        type: ClusterIP
      ingress:
        enabled: false
```

Render the pinned chart and verify that `cockroachdb-public` selects the expected pods and exposes all three named ports:

```bash
helm template cockroachdb \
  oci://registry-1.docker.io/cockroachdb/cockroachdb-chart \
  --version 26.2.4 \
  --namespace cockroachdb \
  --values cockroachdb-values.yaml > rendered.yaml

kubectl get service cockroachdb-public -n cockroachdb -o yaml
kubectl get endpointslice -n cockroachdb \
  -l kubernetes.io/service-name=cockroachdb-public -o wide
```

Pin the chart version in a real installation. The example adds `sql.example.com` to self-signed node certificates because a raw-TCP SQL client sees the CockroachDB node certificate and must verify the external name. With cert-manager or externally managed certificates, place that DNS SAN in the node certificate there instead. Adding the value does not instantly rewrite an existing certificate; follow the selected certificate manager's rotation procedure.

## Create the DB Console HTTP Ingress

Terminate public TLS at the HTTP ingress and use HTTPS to the secure CockroachDB backend:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cockroachdb-console
  namespace: cockroachdb
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - db-console.example.com
      secretName: db-console-edge-tls
  rules:
    - host: db-console.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cockroachdb-public
                port:
                  name: http
```

The annotations above are ingress-nginx-specific. Replace them with the documented settings for the installed controller. Confirm whether that controller validates the backend certificate and how it receives the CockroachDB CA; `backend-protocol: HTTPS` alone is not a universal trust-policy statement.

The DB Console port also serves operational and debug endpoints. Restrict this hostname with network allowlists, identity-aware access, firewall rules, and CockroachDB authentication. Do not assume that an obscure DNS name is access control. Use a separate edge certificate such as `db-console-edge-tls`; it has a different trust boundary and lifecycle from CockroachDB's node and SQL client certificates.

## Expose SQL with a Dedicated LoadBalancer Service

The most portable SQL option is a separate layer-4 `LoadBalancer` Service containing only the SQL port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cockroachdb-sql-external
  namespace: cockroachdb
  annotations:
    # Add only annotations documented by your cloud load-balancer controller.
    # Example concerns include internal/external scope and allowed source ranges.
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: cockroachdb
    app.kubernetes.io/instance: cockroachdb
    app.kubernetes.io/component: cockroachdb
  ports:
    - name: sql
      protocol: TCP
      port: 26257
      targetPort: sql
```

Those selectors match a Helm release named `cockroachdb` with the conventional GA pod-template labels. Before applying the Service, copy and compare the live selectors from `cockroachdb-public`:

```bash
kubectl get service cockroachdb-public -n cockroachdb \
  -o jsonpath='{.spec.selector}{"\n"}'
kubectl get pods -n cockroachdb --show-labels
```

A selector that matches no pods produces an apparently healthy load balancer with no endpoints. A selector that is too broad can route SQL to another cluster. If you use a different Helm release name, name override, or custom labels, change the example.

Configure the cloud load balancer as raw TCP pass-through. Do not enable HTTP mode, SNI routing, or TLS termination unless the product has an explicitly tested PostgreSQL-aware design that preserves CockroachDB's server and client certificate requirements. For mTLS, a raw listener lets CockroachDB authenticate the SQL client directly.

Restrict `loadBalancerSourceRanges`, firewall rules, private-network scope, or equivalent provider controls. SQL should not be globally reachable by default.

## Alternative: Use an Ingress Controller's TCP Feature

If the platform team operates ingress-nginx and accepts database traffic on it, configure its stream listener explicitly. The controller must start with `--tcp-services-configmap=ingress-nginx/tcp-services`, and its own Service must expose port 26257.

The mapping is:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-services
  namespace: ingress-nginx
data:
  "26257": "cockroachdb/cockroachdb-public:sql"
```

Its controller Service needs a corresponding port, for example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: https
      port: 443
      targetPort: https
    - name: cockroachdb-sql
      protocol: TCP
      port: 26257
      targetPort: 26257
```

Merge that port into the controller's actual Service rather than replacing its full manifest. The ingress-nginx chart usually owns the Deployment arguments and Service, so configure them through its values. This is controller configuration, not a `kind: Ingress` resource.

Do not enable PROXY protocol in the ConfigMap merely because the option exists. CockroachDB must be configured to expect any proxy header; sending an unexpected preamble breaks the PostgreSQL handshake. Confirm support end to end first.

Avoid SNI-based `TLSRoute` or ingress-nginx SSL-passthrough routing for SQL. PostgreSQL clients send an SSL negotiation request before the TLS handshake, so the gateway cannot rely on an ordinary initial TLS `ClientHello` with SNI to select the CockroachDB backend. A dedicated address or port avoids that ambiguity.

## Do Not Rely on the Chart's SQL Ingress as a Portability Contract

The current GA CockroachDB chart exposes `cockroachdb.crdbCluster.service.ingress.ui` and `.sql` values and can render two `networking.k8s.io/v1` Ingress objects. The SQL object still uses an HTTP rule whose backend happens to be the Service's `sql` port. That does not expand the Kubernetes Ingress API beyond HTTP/HTTPS.

Leave the chart's SQL host empty unless the chosen ingress controller's official documentation explains exactly how that generated object becomes a PostgreSQL-compatible raw-TCP listener. An annotation such as `nginx.ingress.kubernetes.io/backend-protocol: HTTPS` is not enough: PostgreSQL is not HTTPS.

## Validate Each Path Independently

Check the DB Console with its edge certificate:

```bash
curl --fail --show-error --head https://db-console.example.com/
```

Check SQL with a PostgreSQL-aware client and full certificate verification:

```bash
cockroach sql \
  --url 'postgresql://app_user@sql.example.com:26257/appdb?sslmode=verify-full&sslrootcert=/secure/ca.crt&sslcert=/secure/client.app_user.crt&sslkey=/secure/client.app_user.key' \
  --execute 'SELECT now(), version();'
```

Use the correct client certificate for the SQL user. `openssl s_client` against port 26257 does not reproduce the PostgreSQL SSL negotiation and is not a sufficient end-to-end test.

Verify both DNS records, external addresses, Service endpoints, NetworkPolicies, and load-balancer health checks. Do not aim a generic HTTP health check at SQL port 26257. Use a supported TCP health check or a PostgreSQL-aware check, and choose idle timeouts appropriate for connection pools.

## Official Documentation

- [CockroachDB GA chart Service values](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB GA public Service template and selectors](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/service.public.yaml)
- [CockroachDB GA chart Ingress template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/ingress.yaml)
- [CockroachDB warning about PostgreSQL TLS, SNI routing, and dedicated TCP load balancers](https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-kubernetes#network)
- [CockroachDB certificate authentication](https://www.cockroachlabs.com/docs/stable/authentication)
- [Kubernetes Ingress protocol limits](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes `LoadBalancer` Services](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [ingress-nginx TCP and UDP service configuration](https://kubernetes.github.io/ingress-nginx/user-guide/exposing-tcp-udp-services/)

## Conclusion

Expose the DB Console and SQL as separate protocols, not merely separate hostnames. Route the console through an authenticated HTTPS Ingress. Route SQL through a dedicated raw-TCP load balancer or a documented ingress-controller stream listener, preserving CockroachDB TLS and client authentication. A standard Kubernetes Ingress that points an HTTP rule at port 26257 is not a portable PostgreSQL ingress.
