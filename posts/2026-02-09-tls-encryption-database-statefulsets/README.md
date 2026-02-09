# How to Configure TLS Encryption for Database Connections in Kubernetes StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Implement TLS encryption for database connections in Kubernetes StatefulSets to secure data in transit between clients and database servers using certificate management.

---

Encrypting database connections prevents eavesdropping and man-in-the-middle attacks on your data in transit. Kubernetes makes TLS configuration manageable through certificates stored as secrets and mounted into pods. This guide shows you how to configure TLS for database StatefulSets, manage certificates, and enforce encrypted connections across your cluster.

## Understanding TLS in Kubernetes

TLS encryption requires certificates for server authentication and optionally client authentication. The server presents a certificate proving its identity, and clients verify this certificate before establishing the encrypted connection. For mutual TLS, clients also present certificates that servers verify.

In Kubernetes, cert-manager automates certificate provisioning and renewal. It integrates with Certificate Authorities like Let's Encrypt or can act as its own CA for internal certificates. Certificates are stored as Kubernetes secrets and mounted into pods at runtime.

## Installing cert-manager

Deploy cert-manager for certificate management:

```bash
# Install cert-manager CRDs and components
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
kubectl get crd | grep cert-manager
```

Create a self-signed ClusterIssuer for internal certificates:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ca-certificate
  namespace: cert-manager
spec:
  isCA: true
  commonName: kubernetes-ca
  secretName: ca-secret
  privateKey:
    algorithm: RSA
    size: 4096
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ca-issuer
spec:
  ca:
    secretName: ca-secret
```

Apply the issuer configuration:

```bash
kubectl apply -f cluster-issuer.yaml

# Wait for CA certificate to be ready
kubectl wait --for=condition=ready certificate/ca-certificate -n cert-manager --timeout=60s
```

## Configuring PostgreSQL with TLS

Create certificates for PostgreSQL servers:

```yaml
# postgres-certificates.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: postgres-server-cert
  namespace: database
spec:
  secretName: postgres-tls
  duration: 8760h  # 1 year
  renewBefore: 720h  # 30 days
  subject:
    organizations:
      - MyCompany
  commonName: postgres.database.svc.cluster.local
  dnsNames:
    - postgres
    - postgres.database
    - postgres.database.svc
    - postgres.database.svc.cluster.local
    - "*.postgres-headless.database.svc.cluster.local"
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - digital signature
    - key encipherment
    - server auth
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
```

Deploy PostgreSQL StatefulSet with TLS:

```yaml
# postgres-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: tls-certs
          mountPath: /var/lib/postgresql/certs
          readOnly: true
        - name: config
          mountPath: /docker-entrypoint-initdb.d
        command:
        - postgres
        - -c
        - ssl=on
        - -c
        - ssl_cert_file=/var/lib/postgresql/certs/tls.crt
        - -c
        - ssl_key_file=/var/lib/postgresql/certs/tls.key
        - -c
        - ssl_ca_file=/var/lib/postgresql/certs/ca.crt
        resources:
          requests:
            cpu: 1
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
      volumes:
      - name: tls-certs
        secret:
          secretName: postgres-tls
          defaultMode: 0600
      - name: config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

Create PostgreSQL configuration to require SSL:

```yaml
# postgres-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  init-ssl.sh: |
    #!/bin/bash
    set -e

    # Copy CA certificate to PostgreSQL data directory
    cp /var/lib/postgresql/certs/ca.crt /var/lib/postgresql/data/

    # Set correct permissions
    chmod 600 /var/lib/postgresql/certs/tls.key
    chown postgres:postgres /var/lib/postgresql/certs/*

    # Configure pg_hba.conf to require SSL
    echo "hostssl all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "host all all 0.0.0.0/0 reject" >> /var/lib/postgresql/data/pg_hba.conf
```

Deploy everything:

```bash
kubectl create namespace database
kubectl create secret generic postgres-credentials -n database \
  --from-literal=password=SecurePassword123!

kubectl apply -f postgres-certificates.yaml
kubectl apply -f postgres-config.yaml
kubectl apply -f postgres-statefulset.yaml
```

## Connecting with TLS from Applications

Configure application clients to use TLS:

```python
# app.py
import psycopg2
import ssl

# Get CA certificate from secret
ca_cert_path = "/etc/tls/ca.crt"

# Create SSL context
ssl_context = ssl.create_default_context(cafile=ca_cert_path)
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED

# Connect with TLS
conn = psycopg2.connect(
    host="postgres.database.svc.cluster.local",
    port=5432,
    database="myapp",
    user="postgres",
    password="SecurePassword123!",
    sslmode="verify-full",
    sslrootcert=ca_cert_path
)

# Verify connection is encrypted
cursor = conn.cursor()
cursor.execute("SELECT ssl_is_used(), ssl_version(), ssl_cipher();")
ssl_info = cursor.fetchone()
print(f"SSL Used: {ssl_info[0]}, Version: {ssl_info[1]}, Cipher: {ssl_info[2]}")
```

Mount the CA certificate in your application pods:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DB_HOST
          value: postgres.database.svc.cluster.local
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        volumeMounts:
        - name: ca-cert
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: ca-cert
        secret:
          secretName: postgres-tls
          items:
          - key: ca.crt
            path: ca.crt
```

## Configuring MySQL with TLS

Generate certificates for MySQL:

```yaml
# mysql-certificates.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mysql-server-cert
  namespace: database
spec:
  secretName: mysql-tls
  duration: 8760h
  renewBefore: 720h
  commonName: mysql.database.svc.cluster.local
  dnsNames:
    - mysql
    - mysql.database
    - mysql.database.svc
    - mysql.database.svc.cluster.local
    - "*.mysql-headless.database.svc.cluster.local"
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - digital signature
    - key encipherment
    - server auth
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
```

Deploy MySQL with TLS enabled:

```yaml
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: database
spec:
  serviceName: mysql-headless
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: tls-certs
          mountPath: /etc/mysql/certs
          readOnly: true
        - name: config
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            cpu: 1
            memory: 2Gi
      volumes:
      - name: tls-certs
        secret:
          secretName: mysql-tls
      - name: config
        configMap:
          name: mysql-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: database
data:
  tls.cnf: |
    [mysqld]
    ssl-ca=/etc/mysql/certs/ca.crt
    ssl-cert=/etc/mysql/certs/tls.crt
    ssl-key=/etc/mysql/certs/tls.key
    require_secure_transport=ON
```

## Implementing Mutual TLS (mTLS)

For mutual authentication, create client certificates:

```yaml
# client-certificates.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-client-cert
  namespace: database
spec:
  secretName: app-client-tls
  duration: 8760h
  renewBefore: 720h
  commonName: myapp-client
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - digital signature
    - key encipherment
    - client auth
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
```

Configure PostgreSQL for client certificate verification:

```yaml
# Update pg_hba.conf
hostssl all all 0.0.0.0/0 cert clientcert=verify-full
```

Connect with client certificate:

```python
import psycopg2

conn = psycopg2.connect(
    host="postgres.database.svc.cluster.local",
    port=5432,
    database="myapp",
    user="postgres",
    sslmode="verify-full",
    sslrootcert="/etc/tls/ca.crt",
    sslcert="/etc/tls/client.crt",
    sslkey="/etc/tls/client.key"
)
```

## Automating Certificate Rotation

cert-manager automatically renews certificates. Monitor renewal status:

```bash
# Check certificate status
kubectl get certificate -n database

# View certificate details
kubectl describe certificate postgres-server-cert -n database

# Force renewal for testing
kubectl delete secret postgres-tls -n database
```

Configure renewal alerting:

```yaml
# certificate-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-expiry-alerts
  namespace: database
spec:
  groups:
  - name: certificates
    interval: 60s
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
      for: 1h
      annotations:
        summary: "Certificate expiring in less than 7 days"
        description: "Certificate {{ $labels.name }} expires soon"
```

## Troubleshooting TLS Issues

Common problems and solutions:

```bash
# Check if PostgreSQL is accepting SSL connections
kubectl exec -n database postgres-0 -- \
  psql -U postgres -c "SHOW ssl;"

# Test connection with openssl
kubectl exec -n database postgres-0 -- \
  openssl s_client -connect localhost:5432 -starttls postgres

# Verify certificate validity
kubectl get secret postgres-tls -n database -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout

# Check certificate expiration
kubectl get certificate -n database -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.notAfter}{"\n"}{end}'
```

## Performance Considerations

TLS adds computational overhead. Optimize with:

```yaml
# Use modern ciphers for better performance
ssl_ciphers = 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256'
ssl_prefer_server_ciphers = on
ssl_min_protocol_version = 'TLSv1.2'
```

Monitor TLS performance impact:

- Connection establishment time
- CPU utilization increase
- Throughput changes

## Conclusion

TLS encryption protects your database connections from eavesdropping and tampering. By leveraging cert-manager for automated certificate management and properly configuring database servers and clients, you ensure all data in transit remains encrypted. Regular certificate rotation through cert-manager maintains security without manual intervention. While TLS adds some overhead, the security benefits far outweigh the minimal performance impact. Implement TLS for all database connections in production environments to meet compliance requirements and protect sensitive data.
