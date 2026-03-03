# How to Deploy Keycloak on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Keycloak, Identity Management, Authentication, Kubernetes, Security

Description: Step-by-step guide to deploying Keycloak on Talos Linux for centralized identity and access management in your Kubernetes cluster.

---

Keycloak is an open-source identity and access management solution that provides single sign-on, user federation, identity brokering, and social login out of the box. Deploying it on Talos Linux gives you a rock-solid infrastructure layer underneath your identity provider, thanks to Talos's immutable and minimal design that reduces attack surface - something you definitely want for a security-critical service like Keycloak.

This guide covers everything from initial setup to production hardening, including database configuration, TLS termination, and realm setup.

## Prerequisites

You will need:

- A running Talos Linux Kubernetes cluster
- kubectl configured for your cluster
- Helm v3 installed locally
- A storage provisioner (Longhorn, local-path-provisioner, or similar)
- An ingress controller deployed (Nginx or Traefik)
- A domain name pointed at your ingress (for TLS)

## Creating the Namespace and Secrets

Start with a dedicated namespace for Keycloak:

```bash
# Create a namespace for Keycloak
kubectl create namespace keycloak
```

Create a secret for the initial admin credentials:

```bash
# Create admin credentials secret
kubectl create secret generic keycloak-admin \
  --namespace keycloak \
  --from-literal=username=admin \
  --from-literal=password='your-strong-password-here'
```

Also create a secret for the PostgreSQL database:

```bash
# Create database credentials secret
kubectl create secret generic keycloak-db-secret \
  --namespace keycloak \
  --from-literal=username=keycloak \
  --from-literal=password='your-db-password-here'
```

## Deploying PostgreSQL

Keycloak needs a database backend. While it can use an embedded H2 database, PostgreSQL is strongly recommended for production. Deploy it with a StatefulSet:

```yaml
# keycloak-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: keycloak-postgres
  namespace: keycloak
spec:
  serviceName: keycloak-postgres
  replicas: 1
  selector:
    matchLabels:
      app: keycloak-postgres
  template:
    metadata:
      labels:
        app: keycloak-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: keycloak
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
---
# Service for PostgreSQL
apiVersion: v1
kind: Service
metadata:
  name: keycloak-postgres
  namespace: keycloak
spec:
  ports:
    - port: 5432
  selector:
    app: keycloak-postgres
  clusterIP: None
```

Apply this:

```bash
kubectl apply -f keycloak-postgres.yaml
```

## Deploying Keycloak

Now deploy Keycloak itself. You can use the official Keycloak Operator or a direct Deployment. Here we will use a Deployment for simplicity and clarity:

```yaml
# keycloak-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: keycloak
  labels:
    app: keycloak
spec:
  replicas: 2
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:23.0
          args:
            - start
            - --hostname=keycloak.example.com
            - --proxy=edge
            - --db=postgres
            - --db-url-host=keycloak-postgres
            - --db-url-database=keycloak
            - --health-enabled=true
            - --metrics-enabled=true
          env:
            - name: KEYCLOAK_ADMIN
              valueFrom:
                secretKeyRef:
                  name: keycloak-admin
                  key: username
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-admin
                  key: password
            - name: KC_DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: username
            - name: KC_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: password
          ports:
            - containerPort: 8080
              name: http
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
```

Create the corresponding service and ingress:

```yaml
# keycloak-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  namespace: keycloak
spec:
  ports:
    - port: 8080
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: keycloak
---
# keycloak-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: keycloak
  namespace: keycloak
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-buffer-size: "128k"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - keycloak.example.com
      secretName: keycloak-tls
  rules:
    - host: keycloak.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
```

Apply all resources:

```bash
kubectl apply -f keycloak-deployment.yaml
kubectl apply -f keycloak-service.yaml
```

## Verifying the Deployment

Watch the pods come up:

```bash
# Monitor pod status
kubectl get pods -n keycloak -w
```

Once all pods are running, check that Keycloak responds on its health endpoint:

```bash
# Port-forward to test locally
kubectl port-forward -n keycloak svc/keycloak 8080:8080

# In another terminal, test the health endpoint
curl http://localhost:8080/health/ready
```

## Configuring Keycloak for Your Applications

Once Keycloak is running, access the admin console at your configured domain. Log in with the admin credentials you set earlier.

Here is a quick overview of setting up a realm and client through the Keycloak REST API, which is useful for automation:

```bash
# Get an admin token
TOKEN=$(curl -s -X POST "https://keycloak.example.com/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=your-strong-password-here" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# Create a new realm
curl -s -X POST "https://keycloak.example.com/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "my-apps",
    "enabled": true,
    "registrationAllowed": true
  }'

# Create a client in the new realm
curl -s -X POST "https://keycloak.example.com/admin/realms/my-apps/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "my-web-app",
    "enabled": true,
    "publicClient": true,
    "redirectUris": ["https://myapp.example.com/*"],
    "webOrigins": ["https://myapp.example.com"]
  }'
```

## Production Considerations on Talos Linux

Running Keycloak in production on Talos Linux requires a few extra considerations. First, ensure your database has proper backup mechanisms. Second, since Talos is immutable, you never have to worry about someone logging into the host and modifying system files, which is a big security advantage for an identity provider.

For high availability, run at least two Keycloak replicas and make sure session caching is configured for distributed mode. Keycloak uses Infinispan for caching, and in a Kubernetes environment, it uses DNS-based discovery by default.

You should also set resource limits appropriately. Keycloak can be memory-hungry, especially under high authentication loads. Monitor memory usage and adjust limits based on actual traffic patterns.

## Monitoring and Logging

Since we enabled metrics in the Keycloak startup arguments, you can scrape them with Prometheus:

```yaml
# keycloak-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: keycloak
  namespace: keycloak
spec:
  selector:
    matchLabels:
      app: keycloak
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

For centralized logging, Keycloak outputs structured logs to stdout, which can be collected by any Kubernetes log aggregation solution like Fluentd or Loki.

## Conclusion

Deploying Keycloak on Talos Linux gives you a highly secure identity management platform. The immutable nature of Talos protects your infrastructure layer while Keycloak handles authentication and authorization for your applications. With PostgreSQL for persistence, proper health checks, and monitoring in place, you have a production-ready identity provider that your entire organization can rely on.
