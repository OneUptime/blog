# How to Secure Telemetry Addon Access in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Security, Kubernetes, Observability

Description: A practical guide to securing access to Istio telemetry addons like Grafana, Kiali, Prometheus, and Jaeger in production environments.

---

When you install Istio with its telemetry addons - Grafana, Kiali, Prometheus, Jaeger - they typically come with no authentication or authorization out of the box. That is fine for local development, but running these dashboards wide open in production is a recipe for disaster. Anyone who can reach those endpoints can see your entire mesh topology, traffic patterns, and performance metrics.

This guide walks through practical steps to lock down your telemetry addon access in Istio.

## The Default Problem

By default, Istio's sample addon installations are designed for quick demos. If you installed them using the standard manifests:

```bash
kubectl apply -f samples/addons/
```

You end up with services in the `istio-system` namespace that have no authentication. When you run `istioctl dashboard grafana` or `istioctl dashboard kiali`, it just opens a port-forward with zero auth checks.

For a dev cluster on your laptop, that works. For anything shared or internet-facing, you need to fix this.

## Step 1: Restrict Network Access with Kubernetes NetworkPolicy

The first layer of defense is limiting which pods can even talk to your telemetry services. Create a NetworkPolicy that only allows traffic from specific sources:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: telemetry-addon-access
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: grafana
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
        - podSelector:
            matchLabels:
              app: istio-ingressgateway
      ports:
        - protocol: TCP
          port: 3000
```

Repeat similar policies for Prometheus (port 9090), Kiali (port 20001), and Jaeger (port 16686). This ensures only the ingress gateway and pods within `istio-system` can reach the addon services.

## Step 2: Enable Istio RBAC with AuthorizationPolicy

Istio's AuthorizationPolicy gives you fine-grained control over who can access what. You can restrict access to telemetry addons based on source identity:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grafana-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/monitoring/sa/monitoring-admin"
              - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

This policy says only workloads running with specific service accounts can reach Grafana. Everyone else gets denied. The `principals` field uses the SPIFFE identity format that Istio assigns through mTLS.

## Step 3: Configure Built-in Authentication for Each Addon

Each telemetry addon has its own authentication mechanisms. Here is how to enable them.

### Grafana Authentication

Grafana supports built-in username/password auth. Update the Grafana configuration through its ConfigMap or Helm values:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana
  namespace: istio-system
data:
  grafana.ini: |
    [security]
    admin_user = admin
    admin_password = ${GF_SECURITY_ADMIN_PASSWORD}
    disable_gravatar = true

    [auth]
    disable_login_form = false

    [auth.anonymous]
    enabled = false
```

Store the password in a Kubernetes Secret and reference it via environment variable:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-credentials
  namespace: istio-system
type: Opaque
stringData:
  GF_SECURITY_ADMIN_PASSWORD: "your-strong-password-here"
```

Then mount the secret as an environment variable in the Grafana deployment.

### Kiali Authentication

Kiali supports multiple authentication strategies. The recommended one for production is OpenID Connect, but you can also use token-based auth. Update the Kiali CR or ConfigMap:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: token
  deployment:
    accessible_namespaces:
      - "**"
```

With the `token` strategy, users need a valid Kubernetes ServiceAccount token to log in. You create a service account, bind it to appropriate roles, and use that token for access:

```bash
kubectl create serviceaccount kiali-user -n istio-system
kubectl create clusterrolebinding kiali-user-binding \
  --clusterrole=kiali \
  --serviceaccount=istio-system:kiali-user
```

### Prometheus Authentication

Prometheus does not have built-in auth, so you need to put something in front of it. One common approach is using a reverse proxy. You can add an oauth2-proxy sidecar to the Prometheus pod or deploy it as a separate service.

## Step 4: Use Istio PeerAuthentication for Strict mTLS

Make sure all communication to telemetry addons uses mutual TLS. Apply a PeerAuthentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: telemetry-strict-mtls
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  mtls:
    mode: STRICT
```

Create similar policies for each addon. With STRICT mode, only clients with valid mesh certificates can connect. This prevents any non-mesh workloads from accessing the telemetry services.

## Step 5: Disable Unnecessary Port Exposure

Review your telemetry addon services and make sure they are using ClusterIP, not NodePort or LoadBalancer:

```bash
kubectl get svc -n istio-system | grep -E "grafana|kiali|prometheus|jaeger"
```

If any service is exposed as NodePort or LoadBalancer, patch it:

```bash
kubectl patch svc grafana -n istio-system -p '{"spec": {"type": "ClusterIP"}}'
```

ClusterIP services are only reachable from within the cluster, which is what you want. External access should go through a properly secured ingress gateway.

## Step 6: Audit and Monitor Access

Set up logging so you know who is accessing your telemetry dashboards. Istio's access logging can capture all requests to addon services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: addon-access-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  accessLogging:
    - providers:
        - name: envoy
```

Check the logs with:

```bash
kubectl logs -l app=grafana -n istio-system -c istio-proxy --tail=100
```

## Step 7: Use RBAC to Limit istioctl Dashboard Access

The `istioctl dashboard` command creates port-forwards, which means anyone with kubectl access can bypass your network policies. Limit who can create port-forwards using Kubernetes RBAC:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: no-port-forward
  namespace: istio-system
rules:
  - apiGroups: [""]
    resources: ["pods/portforward"]
    verbs: []
```

Bind this role to users or groups that should not have direct dashboard access.

## Putting It All Together

A solid telemetry security setup combines multiple layers:

1. NetworkPolicy to restrict pod-level network access
2. AuthorizationPolicy for Istio-level access control
3. Built-in addon authentication (Grafana auth, Kiali token auth)
4. Strict mTLS with PeerAuthentication
5. ClusterIP services only - no direct external exposure
6. Access logging for audit trails
7. Kubernetes RBAC to control port-forward access

No single layer is sufficient on its own. Defense in depth is the right approach here. Start with the network-level controls, add Istio policies, enable addon-specific auth, and make sure you have visibility into who is accessing what.

The overhead of setting all this up is small compared to the risk of exposing your entire mesh topology and performance data to unauthorized users.
