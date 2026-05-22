# How to Configure Istio for PCI DSS Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PCI DSS, Compliance, Security, mTLS, Kubernetes

Description: How to configure Istio service mesh to meet PCI DSS requirements including encryption, access controls, logging, and network segmentation.

---

If your Kubernetes workloads handle credit card data, you need to comply with PCI DSS (Payment Card Industry Data Security Standard). Istio can help you meet many of the PCI DSS requirements, especially around encryption in transit, network segmentation, access control, and audit logging. But it doesn't happen automatically. You need to configure it deliberately.

This post maps specific PCI DSS requirements to Istio configurations and shows you how to set each one up.

## PCI DSS Requirements That Istio Addresses

PCI DSS has 12 main requirements. Istio is particularly relevant for:

- **Requirement 1**: Install and maintain network security controls
- **Requirement 2**: Apply secure configurations to all system components
- **Requirement 4**: Protect transmitted cardholder data
- **Requirement 7**: Restrict access to system components by business need
- **Requirement 8**: Identify users and authenticate access
- **Requirement 10**: Log and monitor all access to system components

## Requirement 1: Network Segmentation

PCI DSS requires you to isolate the cardholder data environment (CDE) from the rest of your network. In Kubernetes, you can use Istio authorization policies along with network policies to create this segmentation.

First, label your CDE namespace:

```bash
kubectl label namespace payment-processing pci-scope=cde
```

Then create an authorization policy that denies all traffic to the CDE namespace by default:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: payment-processing
spec:
  {}
```

An empty spec with no rules means deny everything. Now explicitly allow only the services that need access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-checkout-to-payment
  namespace: payment-processing
spec:
  selector:
    matchLabels:
      app: payment-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/checkout-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/process-payment"]
```

This is much more granular than traditional network segmentation. You're not just controlling which IPs can reach which IPs. You're controlling which service identities can call which API endpoints.

Add a Kubernetes NetworkPolicy as a backup layer:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-isolation
  namespace: payment-processing
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              pci-access: allowed
      ports:
        - protocol: TCP
          port: 8443
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: payment-processing
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

## Requirement 4: Encrypt Transmission of Cardholder Data

PCI DSS requires strong cryptography for transmitting cardholder data across open public networks. Istio's mTLS helps satisfy the in-transit encryption control for mesh traffic, but it needs to be part of your broader PCI DSS scope and assessment.

Enforce strict mTLS for the CDE namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: payment-processing
spec:
  mtls:
    mode: STRICT
```

Make sure Istio mutual TLS is used for calls to services in the CDE namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-tls-config
  namespace: payment-processing
spec:
  host: "*.payment-processing.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

If you want to make the minimum workload TLS version explicit, configure it in the mesh config. Istio's default minimum TLS version is TLS 1.2, and you can set a higher minimum if your environment requires it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_2
```

Verify the TLS version by probing from an injected workload's `istio-proxy` container:

```bash
kubectl exec "$(kubectl get pod -n shop -l app=checkout-service \
  -o jsonpath='{.items[0].metadata.name}')" \
  -c istio-proxy -n shop -- \
  openssl s_client -alpn istio -tls1_2 \
  -connect payment-gateway.payment-processing.svc.cluster.local:8443 \
  </dev/null 2>/dev/null | grep "TLSv1.2"
```

## Requirement 7: Restrict Access by Business Need

PCI DSS requires role-based access control. Istio's authorization policies let you implement this at the service level.

Create policies that map to your business roles:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-api-access
  namespace: payment-processing
spec:
  selector:
    matchLabels:
      app: payment-api
  action: ALLOW
  rules:
    # Checkout service can process payments
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/checkout-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/charge", "/api/v1/refund"]
    # Reporting service can read transaction data
    - from:
        - source:
            principals:
              - "cluster.local/ns/reporting/sa/report-generator"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/transactions*"]
    # Admin service has broader access
    - from:
        - source:
            principals:
              - "cluster.local/ns/admin/sa/admin-service"
      when:
        - key: request.headers[x-admin-token]
          notValues: [""]
```

## Requirement 8: Identify and Authenticate

Istio's mTLS provides strong mutual authentication between services using X.509 certificates. Each service has a unique SPIFFE identity:

```text
spiffe://cluster.local/ns/payment-processing/sa/payment-gateway
```

You can add JWT validation for additional authentication. A `RequestAuthentication` rejects invalid JWTs, but requests without JWTs are still accepted unless you also require authenticated principals in an authorization policy:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: payment-jwt-auth
  namespace: payment-processing
spec:
  selector:
    matchLabels:
      app: payment-gateway
  jwtRules:
    - issuer: "https://auth.internal.example.com"
      jwksUri: "https://auth.internal.example.com/.well-known/jwks.json"
      audiences:
        - "payment-gateway"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-payment-jwt
  namespace: payment-processing
spec:
  selector:
    matchLabels:
      app: payment-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

## Requirement 10: Audit Logging

PCI DSS requires comprehensive logging of all access to cardholder data. Configure detailed access logging for the CDE:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: cde-access-logging
  namespace: payment-processing
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Use a custom log format that captures all the fields PCI auditors expect:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "source_identity": "%DOWNSTREAM_PEER_URI_SAN%",
        "destination_identity": "%UPSTREAM_PEER_URI_SAN%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "response_code": "%RESPONSE_CODE%",
        "duration_ms": "%DURATION%",
        "request_id": "%REQ(X-REQUEST-ID)%"
      }
```

This custom JSON format includes source identity, destination identity, method, path, response code, timestamp, duration, and request ID. All of these are relevant for PCI audit trails.

Make sure logs are shipped to a tamper-proof log storage:

```bash
# Example: ship logs to an immutable S3 bucket with object lock

kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
  namespace: logging
data:
  output.conf: |
    [OUTPUT]
        Name  s3
        Match istio-proxy.*
        bucket pci-audit-logs
        region us-west-2
        total_file_size 50M
        upload_timeout 10m
        s3_key_format /pci-logs/%Y/%m/%d/$TAG_%H%M%S
EOF
```

## PCI DSS Compliance Verification

After configuring everything, verify your compliance posture:

```bash
# Verify strict mTLS policies exist
kubectl get peerauthentication -n payment-processing -o yaml

# Verify authorization policies are in effect
kubectl get authorizationpolicies -n payment-processing

# Check that no permissive mTLS exists
kubectl get peerauthentication --all-namespaces -o json | \
  jq '.items[] | select(.spec.mtls.mode != "STRICT") | .metadata.name'
```

Run periodic compliance checks as part of your CI/CD pipeline. Any change that weakens the security posture should be caught before it reaches production.

## Ongoing Compliance

PCI DSS compliance isn't a one-time thing. You need to continuously monitor and validate your configuration. Set up alerts for policy violations:

```yaml
groups:
  - name: pci-compliance
    rules:
      - alert: NonMTLSTrafficInCDE
        expr: |
          sum(rate(istio_requests_total{
            connection_security_policy!="mutual_tls",
            destination_service_namespace="payment-processing"
          }[5m])) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Non-mTLS traffic detected in PCI CDE namespace"
```

Istio gives you powerful tools for PCI DSS compliance, but they only work if you configure them correctly and monitor them continuously. Document your configuration, keep it in version control, and review it with your compliance team regularly.
