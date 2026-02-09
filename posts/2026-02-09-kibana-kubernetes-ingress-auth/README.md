# How to set up Kibana on Kubernetes with Ingress and authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Kubernetes, Ingress, Authentication, EFK Stack

Description: Deploy Kibana on Kubernetes with secure Ingress configuration, TLS termination, and multiple authentication methods including basic auth, OAuth, and SAML for production-ready log visualization.

---

Kibana provides powerful visualization and exploration capabilities for Elasticsearch data. When deploying Kibana on Kubernetes, proper Ingress configuration and authentication are essential for secure access to your log data. This guide covers deploying Kibana with Ingress controllers, TLS certificates, and various authentication mechanisms.

## Deploying Kibana on Kubernetes

Start with a basic Kibana deployment:

```yaml
# kibana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
  labels:
    app: kibana
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
        - name: kibana
          image: docker.elastic.co/kibana/kibana:8.11.0
          ports:
            - containerPort: 5601
              name: http
          env:
            - name: ELASTICSEARCH_HOSTS
              value: "https://elasticsearch.logging.svc:9200"
            - name: ELASTICSEARCH_USERNAME
              value: "elastic"
            - name: ELASTICSEARCH_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
            - name: ELASTICSEARCH_SSL_VERIFICATIONMODE
              value: "none"
            - name: SERVER_NAME
              value: "kibana.example.com"
            - name: SERVER_BASEPATH
              value: ""
            - name: SERVER_REWRITEBASEPATH
              value: "false"
            - name: XPACK_SECURITY_ENABLED
              value: "true"
            - name: XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY
              valueFrom:
                secretKeyRef:
                  name: kibana-encryption-key
                  key: key
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /api/status
              port: 5601
            initialDelaySeconds: 90
            periodSeconds: 10
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /api/status
              port: 5601
            initialDelaySeconds: 60
            periodSeconds: 10
            timeoutSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: logging
  labels:
    app: kibana
spec:
  type: ClusterIP
  selector:
    app: kibana
  ports:
    - port: 5601
      targetPort: 5601
      name: http
```

Create the encryption key secret:

```bash
kubectl create secret generic kibana-encryption-key \
  --from-literal=key=$(openssl rand -base64 32) \
  -n logging
```

## Configuring Ingress with TLS

Set up Ingress with TLS termination:

```yaml
# kibana-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kibana
  namespace: logging
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - kibana.example.com
      secretName: kibana-tls
  rules:
    - host: kibana.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kibana
                port:
                  number: 5601
```

Install cert-manager for automatic TLS certificates:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Implementing basic authentication

Add basic auth to Ingress:

```bash
# Create htpasswd file
htpasswd -c auth admin

# Create secret
kubectl create secret generic kibana-basic-auth \
  --from-file=auth \
  -n logging
```

Update Ingress with auth annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kibana
  namespace: logging
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: kibana-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  # ... rest of ingress config
```

## Configuring OAuth authentication with Keycloak

Set up OAuth integration:

```yaml
# kibana-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kibana-config
  namespace: logging
data:
  kibana.yml: |
    server.name: kibana
    server.host: "0.0.0.0"
    elasticsearch.hosts: ["https://elasticsearch.logging.svc:9200"]
    elasticsearch.username: "elastic"
    elasticsearch.password: "${ELASTICSEARCH_PASSWORD}"
    elasticsearch.ssl.verificationMode: none

    xpack.security.enabled: true
    xpack.security.authc.providers:
      oidc.oidc1:
        order: 0
        realm: "oidc1"
        description: "Log in with Keycloak"
      basic.basic1:
        order: 1
        enabled: true

    server.xsrf.allowlist: ["/api/security/oidc/callback"]
```

Update deployment to use ConfigMap:

```yaml
spec:
  template:
    spec:
      containers:
        - name: kibana
          volumeMounts:
            - name: config
              mountPath: /usr/share/kibana/config/kibana.yml
              subPath: kibana.yml
      volumes:
        - name: config
          configMap:
            name: kibana-config
```

Configure Elasticsearch for OAuth:

```bash
kubectl exec -it elasticsearch-master-0 -n logging -- \
  bin/elasticsearch-setup-passwords auto

# Create OIDC realm in Elasticsearch
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X PUT \
  "https://localhost:9200/_security/realm/oidc/oidc1" \
  -H 'Content-Type: application/json' \
  -d '{
    "order": 2,
    "rp.client_id": "kibana",
    "rp.response_type": "code",
    "rp.redirect_uri": "https://kibana.example.com/api/security/oidc/callback",
    "op.issuer": "https://keycloak.example.com/realms/master",
    "op.authorization_endpoint": "https://keycloak.example.com/realms/master/protocol/openid-connect/auth",
    "op.token_endpoint": "https://keycloak.example.com/realms/master/protocol/openid-connect/token",
    "op.userinfo_endpoint": "https://keycloak.example.com/realms/master/protocol/openid-connect/userinfo",
    "op.jwkset_path": "https://keycloak.example.com/realms/master/protocol/openid-connect/certs",
    "rp.post_logout_redirect_uri": "https://kibana.example.com/logged_out",
    "claims.principal": "preferred_username",
    "claims.groups": "groups"
  }'
```

## Implementing SAML authentication

Configure SAML integration:

```yaml
# kibana-saml-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kibana-config
  namespace: logging
data:
  kibana.yml: |
    server.name: kibana
    server.host: "0.0.0.0"
    elasticsearch.hosts: ["https://elasticsearch.logging.svc:9200"]

    xpack.security.authc.providers:
      saml.saml1:
        order: 0
        realm: "saml1"
        description: "Log in with SAML"
      basic.basic1:
        order: 1

    xpack.security.authc.saml.realm: saml1
```

Configure Elasticsearch SAML realm:

```bash
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X PUT \
  "https://localhost:9200/_security/realm/saml/saml1" \
  -H 'Content-Type: application/json' \
  -d '{
    "order": 2,
    "idp.metadata.path": "https://idp.example.com/metadata",
    "idp.entity_id": "https://idp.example.com",
    "sp.entity_id": "https://kibana.example.com",
    "sp.acs": "https://kibana.example.com/api/security/saml/callback",
    "sp.logout": "https://kibana.example.com/logout",
    "attributes.principal": "nameid",
    "attributes.groups": "groups"
  }'
```

## Configuring role-based access control

Define Kibana roles and spaces:

```bash
# Create role for read-only access
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X POST \
  "https://localhost:9200/_security/role/kibana_read_only" \
  -H 'Content-Type: application/json' \
  -d '{
    "cluster": ["monitor"],
    "indices": [{
      "names": ["logstash-*", "kubernetes-*"],
      "privileges": ["read", "view_index_metadata"]
    }],
    "applications": [{
      "application": "kibana-.kibana",
      "privileges": ["read"],
      "resources": ["*"]
    }]
  }'

# Create role for full access
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X POST \
  "https://localhost:9200/_security/role/kibana_admin" \
  -H 'Content-Type: application/json' \
  -d '{
    "cluster": ["all"],
    "indices": [{
      "names": ["*"],
      "privileges": ["all"]
    }],
    "applications": [{
      "application": "kibana-.kibana",
      "privileges": ["all"],
      "resources": ["*"]
    }]
  }'

# Create user with read-only role
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X POST \
  "https://localhost:9200/_security/user/viewer" \
  -H 'Content-Type: application/json' \
  -d '{
    "password": "viewerpassword",
    "roles": ["kibana_read_only"],
    "full_name": "Read Only User"
  }'
```

## Implementing IP whitelisting

Restrict access by IP address:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kibana
  namespace: logging
  annotations:
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
spec:
  # ... ingress configuration
```

Or use NetworkPolicy for pod-level restrictions:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kibana-network-policy
  namespace: logging
spec:
  podSelector:
    matchLabels:
      app: kibana
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 5601
```

## Configuring session management

Tune session settings for security and usability:

```yaml
# kibana-config with session settings
data:
  kibana.yml: |
    xpack.security.session.idleTimeout: "1h"
    xpack.security.session.lifespan: "8h"
    xpack.security.session.cleanupInterval: "1h"

    xpack.security.secureCookies: true
    xpack.security.sameSiteCookies: "Strict"
```

## Monitoring Kibana access

Set up audit logging:

```yaml
data:
  kibana.yml: |
    xpack.security.audit.enabled: true
    xpack.security.audit.appender:
      type: rolling-file
      fileName: /var/log/kibana/kibana_audit.log
      policy:
        type: time-interval
        interval: 24h
      layout:
        type: json
```

Add volume for audit logs:

```yaml
spec:
  template:
    spec:
      containers:
        - name: kibana
          volumeMounts:
            - name: audit-logs
              mountPath: /var/log/kibana
      volumes:
        - name: audit-logs
          emptyDir: {}
```

## Implementing high availability

Configure multiple replicas with anti-affinity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - kibana
                topologyKey: kubernetes.io/hostname
      # ... rest of pod spec
```

## Best practices for Kibana on Kubernetes

1. **Enable TLS:** Always use HTTPS for Kibana access
2. **Implement authentication:** Never expose Kibana without auth
3. **Use RBAC:** Configure role-based access control for different user types
4. **Monitor access:** Enable audit logging for security compliance
5. **Configure session timeouts:** Balance security with usability
6. **Use multiple replicas:** Ensure high availability
7. **Set resource limits:** Prevent Kibana from consuming excessive resources
8. **Regular updates:** Keep Kibana version in sync with Elasticsearch

## Conclusion

Deploying Kibana on Kubernetes with proper Ingress configuration and authentication creates a secure, accessible interface for exploring your Elasticsearch log data. Whether using basic authentication for simplicity, OAuth for SSO integration, or SAML for enterprise environments, properly configured authentication ensures only authorized users can access your logs. Combined with TLS termination, role-based access control, and high availability configuration, your Kibana deployment provides a production-ready visualization layer for your EFK logging stack.
