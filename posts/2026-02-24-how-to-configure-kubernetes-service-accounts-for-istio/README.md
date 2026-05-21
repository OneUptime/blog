# How to Configure Kubernetes Service Accounts for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Account, Security, RBAC

Description: Step-by-step guide to configuring Kubernetes service accounts for Istio workloads including identity, mTLS, and authorization policies.

---

Service accounts in Kubernetes are the foundation of workload identity in Istio. Every pod in the mesh gets a cryptographic identity derived from its Kubernetes service account, and Istio uses that identity for mutual TLS authentication and authorization policy enforcement. If you get the service account setup wrong, your security policies will not work the way you expect.

Most people use the default service account and call it a day. That is a mistake. Sharing service accounts across workloads means those workloads share the same identity, which defeats the purpose of fine-grained authorization.

## Why Service Accounts Matter for Istio

When Istio's control plane issues certificates to sidecars, it uses the format `spiffe://cluster.local/ns/<namespace>/sa/<service-account>` as the workload identity. This SPIFFE identity is what gets checked in authorization policies.

If two deployments share the same service account, they share the same identity. An authorization policy that allows traffic from one will also allow traffic from the other. That is usually not what you want.

Check the identity of a running sidecar:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15000/certs | grep "Subject:"
```

Or use istioctl:

```bash
istioctl proxy-config secret -n your-namespace deploy/your-app
```

## Creating Dedicated Service Accounts

Create a unique service account for each workload:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: inventory-service
  namespace: production
```

Apply them:

```bash
kubectl apply -f service-accounts.yaml
```

Then reference each service account in its corresponding deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myregistry/order-service:v1.2.0
          ports:
            - containerPort: 8080
```

## Configuring Authorization Based on Service Accounts

With dedicated service accounts in place, you can write precise authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/order-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/payments"]
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/order-service"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/payments/*"]
```

This policy says only the order service can create and read payments. No other service in the mesh can access the payment service, even if they are in the same namespace.

## Automating Service Account Creation

If you have many services, manually creating service accounts gets tedious. Use Kustomize to manage them alongside the deployments:

```yaml
# kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - service-accounts.yaml
  - deployments/
```

Or use a shell script to create service accounts for all deployments that are using the default account:

```bash
#!/bin/bash
NAMESPACE="production"

for DEPLOY in $(kubectl get deploy -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
  SA=$(kubectl get deploy -n $NAMESPACE $DEPLOY -o jsonpath='{.spec.template.spec.serviceAccountName}')
  if [ "$SA" = "" ] || [ "$SA" = "default" ]; then
    echo "Creating service account for $DEPLOY"
    kubectl create serviceaccount $DEPLOY -n $NAMESPACE
    kubectl patch deploy $DEPLOY -n $NAMESPACE \
      -p "{\"spec\":{\"template\":{\"spec\":{\"serviceAccountName\":\"$DEPLOY\"}}}}"
  fi
done
```

## Service Account Token Configuration

Istio relies on Kubernetes service account tokens for initial authentication with the control plane. The sidecar presents its service account token to istiod, which validates it and issues an X.509 certificate.

On modern Kubernetes clusters, the automatically mounted service account token is a projected token that is audience-bound and time-limited, unless token automounting is disabled. Make sure your cluster supports the TokenRequest API that Istio uses for third-party service account tokens:

```bash
kubectl get --raw /api/v1 | \
  jq '.resources[] | select(.name | index("serviceaccounts/token"))'
```

For Istio specifically, the token audience is configured by the sidecar injector for the proxy token. Check the mesh trust domain separately:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A5 "trustDomain"
```

The default trust domain is `cluster.local`. If you have changed it, make sure authorization policies use the correct trust domain.

## Restricting Service Account Permissions

Your application containers should have minimal Kubernetes API permissions. Any container in the same pod that can read the mounted service account token can use the Kubernetes RBAC permissions of that service account, so scope role bindings to what each service actually needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-service-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["order-service-config"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["order-service-db-credentials"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: order-service
    namespace: production
roleRef:
  kind: Role
  name: order-service-role
  apiGroup: rbac.authorization.k8s.io
```

## Disabling Auto-Mounting for Security

For pods that do not need to interact with the Kubernetes API (which is most application pods), disable automatic service account token mounting:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
automountServiceAccountToken: false
```

Wait, if you disable token auto-mounting, will Istio still work? Yes, but you need to be careful. The Istio sidecar injector adds its own projected volume for the token it needs. The sidecar injection webhook handles this separately from the default service account token mount.

Verify by checking the injected pod spec:

```bash
kubectl get pod -n production -l app=order-service -o json | \
  jq '.items[0].spec.volumes[] | select(.name | contains("istio"))'
```

## Cross-Namespace Service Account References

When services in different namespaces need to communicate, the authorization policy references the full peer principal string:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-cross-namespace
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/web-app"
              - "cluster.local/ns/production/sa/order-service"
```

## Verifying Service Account Identity

After setting everything up, verify that identities are correct:

```bash
# Check the certificate issued to a sidecar
istioctl proxy-config secret -n production deploy/order-service -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'

# Check the outbound cluster configuration for the destination service
istioctl proxy-config cluster -n production deploy/order-service \
  --fqdn payment-service.production.svc.cluster.local
```

Test that authorization policies enforce correctly:

```bash
# From inside a pod with the correct service account
kubectl exec -n production deploy/order-service -c order-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/v1/payments

# From inside a pod with a different service account (should be denied)
kubectl exec -n production deploy/inventory-service -c inventory-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/v1/payments
```

Getting service accounts right is foundational work. It is not glamorous, but without proper identity setup, all the authorization policies and mTLS configuration in the world will not actually secure your mesh. Take the time to give each workload its own identity, and everything else becomes much easier to reason about.
