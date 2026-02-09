# How to Configure Database TLS Encryption for In-Transit Data Protection on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Database, TLS, Security, Encryption

Description: Implement TLS encryption for database connections on Kubernetes to protect data in transit, including certificate management, mutual TLS authentication, and client configuration for PostgreSQL, MySQL, and MongoDB.

---

Database TLS encryption protects sensitive data as it travels between applications and databases. On Kubernetes, implementing TLS requires certificate management, proper configuration of both servers and clients, and ongoing certificate rotation strategies.

## Understanding TLS for Databases

TLS encryption establishes an encrypted channel between clients and database servers. The server presents a certificate proving its identity, and the client verifies this certificate against a trusted Certificate Authority. This prevents man-in-the-middle attacks and eavesdropping on the network.

Mutual TLS extends this by requiring clients to present certificates too. The database server verifies client certificates, ensuring only authorized applications connect. This provides stronger authentication than passwords alone and works well in zero-trust architectures.

Certificate management becomes critical in dynamic Kubernetes environments. Certificates have expiration dates and require rotation. Using cert-manager automates certificate lifecycle management, reducing operational burden and preventing expired certificate outages.

## Installing cert-manager

Deploy cert-manager to handle certificate generation and renewal:

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0
```

Verify installation:

```bash
kubectl get pods -n cert-manager
kubectl get crds | grep cert-manager
```

## Creating Certificate Authority

Create a self-signed CA for internal certificates:

```yaml
# ca-issuer.yaml
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
  name: database-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: database-ca
  secretName: database-ca-secret
  privateKey:
    algorithm: RSA
    size: 4096
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: database-ca-issuer
spec:
  ca:
    secretName: database-ca-secret
```

Apply the issuer configuration:

```bash
kubectl apply -f ca-issuer.yaml
```

## Configuring PostgreSQL with TLS

Create server certificates for PostgreSQL:

```yaml
# postgres-tls-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: postgres-tls
  namespace: databases
spec:
  secretName: postgres-tls-secret
  duration: 2160h # 90 days
  renewBefore: 360h # 15 days
  subject:
    organizations:
      - mycompany
  commonName: postgres.databases.svc.cluster.local
  dnsNames:
    - postgres
    - postgres.databases
    - postgres.databases.svc
    - postgres.databases.svc.cluster.local
    - "*.postgres.databases.svc.cluster.local"
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
    - client auth
  issuerRef:
    name: database-ca-issuer
    kind: ClusterIssuer
    group: cert-manager.io
```

Apply the certificate:

```bash
kubectl create namespace databases
kubectl apply -f postgres-tls-cert.yaml
```

Deploy PostgreSQL with TLS enabled:

```yaml
# postgres-with-tls.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-tls-config
  namespace: databases
data:
  pg_hba.conf: |
    # TYPE  DATABASE        USER            ADDRESS                 METHOD
    hostssl all             all             0.0.0.0/0               md5
    hostssl all             all             ::/0                    md5
    local   all             all                                     trust

  postgresql.conf: |
    ssl = on
    ssl_cert_file = '/etc/postgresql/certs/tls.crt'
    ssl_key_file = '/etc/postgresql/certs/tls.key'
    ssl_ca_file = '/etc/postgresql/certs/ca.crt'
    ssl_min_protocol_version = 'TLSv1.2'
    ssl_prefer_server_ciphers = on
    ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 1
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
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
            - name: tls-certs
              mountPath: /etc/postgresql/certs
              readOnly: true
            - name: postgres-config
              mountPath: /etc/postgresql/postgresql.conf
              subPath: postgresql.conf
            - name: postgres-config
              mountPath: /etc/postgresql/pg_hba.conf
              subPath: pg_hba.conf
          command:
            - postgres
            - -c
            - config_file=/etc/postgresql/postgresql.conf
            - -c
            - hba_file=/etc/postgresql/pg_hba.conf
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
      volumes:
        - name: tls-certs
          secret:
            secretName: postgres-tls-secret
            items:
              - key: tls.crt
                path: tls.crt
              - key: tls.key
                path: tls.key
                mode: 0600
              - key: ca.crt
                path: ca.crt
        - name: postgres-config
          configMap:
            name: postgres-tls-config
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None
  selector:
    app: postgres
```

## Configuring Client Applications

Create a client certificate for applications:

```yaml
# postgres-client-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-postgres-client
  namespace: applications
spec:
  secretName: app-postgres-client-secret
  duration: 2160h
  renewBefore: 360h
  commonName: appuser
  usages:
    - client auth
  issuerRef:
    name: database-ca-issuer
    kind: ClusterIssuer
```

Configure the application to use TLS:

```yaml
# application-with-postgres-tls.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: applications
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: DATABASE_URL
              value: "postgresql://appuser:password@postgres.databases.svc.cluster.local:5432/appdb?sslmode=verify-full&sslcert=/etc/postgres/client/tls.crt&sslkey=/etc/postgres/client/tls.key&sslrootcert=/etc/postgres/client/ca.crt"
          volumeMounts:
            - name: postgres-client-certs
              mountPath: /etc/postgres/client
              readOnly: true
      volumes:
        - name: postgres-client-certs
          secret:
            secretName: app-postgres-client-secret
            items:
              - key: tls.crt
                path: tls.crt
              - key: tls.key
                path: tls.key
                mode: 0600
              - key: ca.crt
                path: ca.crt
```

## Configuring MySQL with TLS

Create MySQL TLS certificates:

```yaml
# mysql-tls-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mysql-tls
  namespace: databases
spec:
  secretName: mysql-tls-secret
  duration: 2160h
  renewBefore: 360h
  commonName: mysql.databases.svc.cluster.local
  dnsNames:
    - mysql
    - mysql.databases
    - mysql.databases.svc
    - mysql.databases.svc.cluster.local
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
  issuerRef:
    name: database-ca-issuer
    kind: ClusterIssuer
```

Deploy MySQL with TLS:

```yaml
# mysql-with-tls.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-tls-config
  namespace: databases
data:
  my.cnf: |
    [mysqld]
    ssl-ca=/etc/mysql/certs/ca.crt
    ssl-cert=/etc/mysql/certs/tls.crt
    ssl-key=/etc/mysql/certs/tls.key
    require_secure_transport=ON
    tls_version=TLSv1.2,TLSv1.3
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: databases
spec:
  serviceName: mysql
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
              name: mysql
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            - name: MYSQL_DATABASE
              value: appdb
          volumeMounts:
            - name: mysql-storage
              mountPath: /var/lib/mysql
            - name: tls-certs
              mountPath: /etc/mysql/certs
              readOnly: true
            - name: mysql-config
              mountPath: /etc/mysql/conf.d/my.cnf
              subPath: my.cnf
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
      volumes:
        - name: tls-certs
          secret:
            secretName: mysql-tls-secret
            items:
              - key: tls.crt
                path: tls.crt
              - key: tls.key
                path: tls.key
                mode: 0600
              - key: ca.crt
                path: ca.crt
        - name: mysql-config
          configMap:
            name: mysql-tls-config
  volumeClaimTemplates:
    - metadata:
        name: mysql-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

## Configuring MongoDB with TLS

Create MongoDB TLS certificates:

```yaml
# mongodb-tls-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mongodb-tls
  namespace: databases
spec:
  secretName: mongodb-tls-secret
  duration: 2160h
  renewBefore: 360h
  commonName: mongodb.databases.svc.cluster.local
  dnsNames:
    - mongodb
    - mongodb.databases
    - mongodb.databases.svc
    - mongodb.databases.svc.cluster.local
    - "*.mongodb.databases.svc.cluster.local"
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
  issuerRef:
    name: database-ca-issuer
    kind: ClusterIssuer
```

Deploy MongoDB with TLS:

```yaml
# mongodb-with-tls.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: databases
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      initContainers:
        - name: prepare-certs
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              cat /etc/mongodb/certs/tls.crt /etc/mongodb/certs/tls.key > /etc/mongodb/combined/mongodb.pem
              chmod 0600 /etc/mongodb/combined/mongodb.pem
              cp /etc/mongodb/certs/ca.crt /etc/mongodb/combined/
          volumeMounts:
            - name: tls-certs
              mountPath: /etc/mongodb/certs
            - name: combined-certs
              mountPath: /etc/mongodb/combined
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: mongodb
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
          command:
            - mongod
            - --tlsMode=requireTLS
            - --tlsCertificateKeyFile=/etc/mongodb/combined/mongodb.pem
            - --tlsCAFile=/etc/mongodb/combined/ca.crt
            - --bind_ip_all
          volumeMounts:
            - name: mongodb-storage
              mountPath: /data/db
            - name: combined-certs
              mountPath: /etc/mongodb/combined
              readOnly: true
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
      volumes:
        - name: tls-certs
          secret:
            secretName: mongodb-tls-secret
        - name: combined-certs
          emptyDir: {}
  volumeClaimTemplates:
    - metadata:
        name: mongodb-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

## Testing TLS Connections

Verify PostgreSQL TLS connection:

```bash
kubectl exec -it -n databases postgres-0 -- psql "postgresql://appuser:password@localhost:5432/appdb?sslmode=require" -c "\conninfo"
```

Test MySQL TLS:

```bash
kubectl exec -it -n databases mysql-0 -- mysql -u root -p -e "SHOW VARIABLES LIKE '%ssl%';"
```

Verify MongoDB TLS:

```bash
kubectl exec -it -n databases mongodb-0 -- mongosh --tls --tlsCAFile /etc/mongodb/combined/ca.crt --host mongodb.databases.svc.cluster.local --eval "db.adminCommand({ getParameter: 1, tlsMode: 1 })"
```

## Monitoring Certificate Expiration

Set up alerts for expiring certificates using Prometheus and cert-manager metrics:

```yaml
# cert-expiry-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiration
  namespace: databases
spec:
  groups:
    - name: certificates
      rules:
        - alert: CertificateExpiringSoon
          expr: certmanager_certificate_expiration_timestamp_seconds - time() < 86400 * 7
          labels:
            severity: warning
          annotations:
            summary: "Certificate expiring soon"
            description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} expires in less than 7 days"
```

Database TLS encryption on Kubernetes protects sensitive data in transit while cert-manager automates the operational complexity of certificate lifecycle management. Proper implementation of TLS provides defense-in-depth security without significantly impacting database performance.
