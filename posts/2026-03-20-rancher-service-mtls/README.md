# How to Configure mTLS Between Services in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, mTLS, Security, Service Mesh, TLS

Description: Configure mutual TLS (mTLS) between services in Rancher-managed clusters to ensure all inter-service communication is authenticated and encrypted.

## Introduction

Mutual TLS (mTLS) ensures that both the client and server authenticate each other using certificates, providing strong identity verification and encryption for all service-to-service communication. In Kubernetes, mTLS is typically implemented via a service mesh or through manual certificate management. This guide covers both approaches in Rancher-managed environments.

## Prerequisites

- Rancher-managed cluster with Istio or Linkerd installed
- Linkerd Viz extension if you want to use `linkerd viz` verification commands
- cert-manager for certificate management
- kubectl with cluster-admin access
- Basic understanding of TLS/PKI

## Understanding mTLS in Kubernetes

Standard TLS: Server proves its identity to the client.
mTLS: Both server AND client prove their identities to each other using certificates.

## Method 1: mTLS with Istio (Recommended)

### Enable Strict mTLS for the Entire Mesh

```yaml
# peer-authentication-global.yaml - Enforce mTLS mesh-wide

apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  # Put this in Istio's root namespace. For the default install, that is istio-system.
  namespace: istio-system
spec:
  mtls:
    # STRICT: reject all non-mTLS traffic
    mode: STRICT
```

### Enable mTLS Per Namespace

```yaml
# peer-authentication-ns.yaml - Namespace-scoped mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: namespace-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### Enable mTLS Per Workload

```yaml
# peer-authentication-workload.yaml - Workload-specific mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: backend-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  mtls:
    mode: STRICT
  # portLevelMtls applies to workload ports, not Service ports.
  portLevelMtls:
    9090:  # Metrics or health port - allow plaintext if needed
      mode: DISABLE
```

### Verify Istio mTLS is Working

```bash
# Check the PeerAuthentication policy
kubectl get peerauthentication -n production

# Check that all pods have Istio sidecar injected
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'

# Test traffic from an injected client pod
kubectl exec -n production deployment/frontend -- \
  curl -sS http://backend.production.svc.cluster.local/health

# View certificate details
istioctl proxy-config secret <pod-name>.production
```

## Method 2: mTLS with Linkerd

Linkerd enables mTLS by default for all meshed services. If the Linkerd Viz extension is installed, you can verify it with:

```bash
# Verify mTLS is active across meshed workloads
linkerd viz edges deploy -n production

# Check the proxy identity certificate expiry metric
linkerd diagnostics proxy-metrics -n production po/<pod-name> | \
  grep identity_cert_expiration_timestamp_seconds

# Watch live requests; meshed traffic shows tls=true
linkerd viz tap deploy/backend -n production
```

```yaml
# linkerd-mtls-annotation.yaml - Enable Linkerd proxy injection for a workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: backend
          image: registry.example.com/backend:v1.0
```

## Method 3: Manual mTLS with cert-manager

For services not using a service mesh, bootstrap an internal CA and issue workload certificates with cert-manager:

```yaml
# cert-manager-ca-issuer.yaml - Bootstrap an internal CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-bootstrap
spec:
  selfSigned: {}
---
# internal-ca-certificate.yaml - Root CA secret in the cert-manager namespace
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-secret
  issuerRef:
    name: selfsigned-bootstrap
    kind: ClusterIssuer
---
# internal-ca-issuer.yaml - Cluster issuer backed by the generated CA secret
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-secret
---
# service-certificate.yaml - Certificate for backend service
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: backend-tls
  namespace: production
spec:
  # The secret to store the certificate
  secretName: backend-tls-secret
  duration: 24h
  # Auto-renew before expiry
  renewBefore: 1h
  subject:
    organizations:
      - example.com
  dnsNames:
    - backend.production.svc.cluster.local
    - backend.production.svc
    - backend
  usages:
    - server auth
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
---
# client-certificate.yaml - Certificate for the frontend client
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: frontend-client-tls
  namespace: production
spec:
  secretName: frontend-client-tls-secret
  duration: 24h
  renewBefore: 1h
  subject:
    organizations:
      - example.com
  dnsNames:
    - frontend.production.svc.cluster.local
    - frontend.production.svc
    - frontend
  usages:
    - client auth
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
```

Mount each workload's own certificate and key, and configure the application with its own TLS flags or environment variables. Distribute the CA certificate to workloads as a separate trust bundle:

```yaml
# backend-mtls-deployment.yaml - App mounting its serving certificate
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: registry.example.com/backend:v1.0
          ports:
            - containerPort: 8443  # HTTPS port
          volumeMounts:
            - name: tls-certs
              mountPath: /certs
              readOnly: true
          # Configure your application to use /certs/tls.crt and /certs/tls.key,
          # and to trust the client CA bundle you distribute separately.
      volumes:
        - name: tls-certs
          secret:
            secretName: backend-tls-secret
```

## Step 4: Testing mTLS Connectivity

```bash
# Assuming the frontend pod mounts its own client certificate at /client-certs
# and the trusted CA at /trust, mTLS should succeed
kubectl exec -n production deployment/frontend -- \
  curl -v \
  --cert /client-certs/tls.crt \
  --key /client-certs/tls.key \
  --cacert /trust/ca.crt \
  https://backend.production.svc.cluster.local:8443/health

# Test should FAIL without a client certificate when mTLS is enforced
kubectl exec -n production deployment/frontend -- \
  curl -v \
  --cacert /trust/ca.crt \
  https://backend.production.svc.cluster.local:8443/health
# Expected: TLS handshake fails because no client certificate is presented
```

## Step 5: Authorization Policies with mTLS Identity

Use mTLS identity for authorization:

```yaml
# authorization-policy.yaml - AuthorizationPolicy using mTLS identity
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            # Only allow requests with this specific identity
            principals:
              - "cluster.local/ns/production/sa/frontend-sa"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

## Step 6: Monitor mTLS Certificate Health

```bash
# Check certificate expiry across Istio-injected workloads
kubectl get pods --all-namespaces \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}' | \
  awk '/istio-proxy/ {print $2 "." $1}' | \
  xargs -n1 istioctl proxy-config secret

# Check cert-manager certificate status
kubectl get certificates --all-namespaces

# Review upcoming cert-manager renewal times
kubectl get certificates --all-namespaces \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.renewalTime}{"\n"}{end}'
```

## Conclusion

mTLS is a foundational security control for microservice architectures. Service meshes like Istio and Linkerd make it trivial to enable mTLS for all inter-service communication with zero application code changes. For services outside the mesh, cert-manager provides automated certificate lifecycle management. Always combine mTLS with proper authorization policies to get the full benefit of strong service identity-authentication alone is not sufficient without access control.
