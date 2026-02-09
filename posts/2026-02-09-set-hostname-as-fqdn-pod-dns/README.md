# How to Configure setHostnameAsFQDN for Fully Qualified Pod DNS Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Networking

Description: Learn how to use the setHostnameAsFQDN field to configure pods to use their fully qualified domain name as the hostname for better service discovery and application compatibility.

---

Most applications running in Kubernetes containers see a simple hostname like `web-app-7b8c9d`, but some legacy applications or distributed systems expect the hostname to be a fully qualified domain name (FQDN) like `web-app-7b8c9d.default.svc.cluster.local`. The `setHostnameAsFQDN` field in the pod specification solves this problem by configuring the container's hostname to be its complete DNS name.

This field is particularly valuable when migrating applications to Kubernetes that were originally designed for traditional server environments where machines have FQDN hostnames.

## Understanding the Default Behavior

By default, when you run `hostname` inside a Kubernetes container, you get the pod name or the custom hostname you specified:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app-xyz123
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    command: ["/bin/sh", "-c", "hostname && sleep 3600"]
```

Running this pod shows:

```bash
kubectl logs web-app-xyz123
# Output: web-app-xyz123
```

The FQDN exists in DNS, but it's not what the container sees as its hostname.

## Enabling setHostnameAsFQDN

The `setHostnameAsFQDN` field changes this behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  namespace: production
spec:
  setHostnameAsFQDN: true
  containers:
  - name: nginx
    image: nginx:1.25
    command: ["/bin/sh"]
    args:
    - -c
    - |
      echo "Hostname: $(hostname)"
      echo "FQDN: $(hostname -f)"
      sleep 3600
```

Now the output shows:

```bash
kubectl logs web-app
# Hostname: web-app.production.pod.cluster.local
# FQDN: web-app.production.pod.cluster.local
```

The container sees its full DNS name as the hostname. This matches what many enterprise applications expect.

## Combining with hostname and subdomain

For even more control, combine `setHostnameAsFQDN` with custom hostname and subdomain:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-cluster
  namespace: data
spec:
  clusterIP: None  # Headless service
  selector:
    app: database
  ports:
  - port: 5432
---
apiVersion: v1
kind: Pod
metadata:
  name: db-primary
  namespace: data
  labels:
    app: database
spec:
  hostname: db-master
  subdomain: database-cluster
  setHostnameAsFQDN: true
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
    command: ["/bin/bash"]
    args:
    - -c
    - |
      # The hostname is now the FQDN
      echo "Starting PostgreSQL with hostname: $(hostname)"
      # hostname will show: db-master.database-cluster.data.svc.cluster.local

      # This is useful for replication configurations
      export PRIMARY_HOST=$(hostname)

      # Start PostgreSQL
      docker-entrypoint.sh postgres
```

The container now identifies itself as `db-master.database-cluster.data.svc.cluster.local`, which is valuable for replication protocols that require FQDN identities.

## Use Case: Java Applications with Kerberos

Many enterprise Java applications use Kerberos authentication, which requires FQDN hostnames:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-app
  namespace: enterprise
spec:
  hostname: app-server
  subdomain: java-cluster
  setHostnameAsFQDN: true
  containers:
  - name: application
    image: openjdk:17-jdk
    env:
    - name: JAVA_OPTS
      value: |
        -Djava.security.krb5.conf=/etc/krb5.conf
        -Djava.security.auth.login.config=/etc/jaas.conf
        -Dsun.security.krb5.debug=true
    volumeMounts:
    - name: kerberos-config
      mountPath: /etc/krb5.conf
      subPath: krb5.conf
    - name: jaas-config
      mountPath: /etc/jaas.conf
      subPath: jaas.conf
    - name: keytab
      mountPath: /etc/security/keytabs
      readOnly: true
    command: ["/bin/bash"]
    args:
    - -c
    - |
      # Verify FQDN hostname for Kerberos
      FQDN=$(hostname -f)
      echo "Application FQDN: $FQDN"

      # Kerberos expects the service principal to match FQDN
      # service/app-server.java-cluster.enterprise.svc.cluster.local@REALM

      kinit -kt /etc/security/keytabs/app.keytab "service/$FQDN@COMPANY.COM"

      # Start application
      java $JAVA_OPTS -jar /app/application.jar
  volumes:
  - name: kerberos-config
    configMap:
      name: kerberos-config
  - name: jaas-config
    configMap:
      name: jaas-config
  - name: keytab
    secret:
      secretName: kerberos-keytab
```

Without `setHostnameAsFQDN: true`, the Kerberos authentication would fail because the principal name wouldn't match the hostname.

## StatefulSet Integration

StatefulSets work seamlessly with this field:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
  - port: 9042
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      setHostnameAsFQDN: true
      containers:
      - name: cassandra
        image: cassandra:4.1
        env:
        - name: CASSANDRA_SEEDS
          # Use FQDN for seed nodes
          value: "cassandra-0.cassandra.default.svc.cluster.local,cassandra-1.cassandra.default.svc.cluster.local"
        - name: CASSANDRA_CLUSTER_NAME
          value: "KubernetesCluster"
        ports:
        - containerPort: 9042
        volumeMounts:
        - name: data
          mountPath: /var/lib/cassandra
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                # Wait for Cassandra to start
                until cqlsh -e "describe cluster" ; do
                  echo "Waiting for Cassandra..."
                  sleep 5
                done

                # Log the FQDN for debugging
                echo "Cassandra node FQDN: $(hostname -f)"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Each Cassandra pod sees its FQDN as the hostname, which aligns with Cassandra's expectation that nodes identify themselves by fully qualified names.

## Application Configuration Examples

Here's a Python application that benefits from FQDN hostnames:

```python
# app.py
import socket
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_node_identity():
    """
    Get the node's identity for cluster membership.
    With setHostnameAsFQDN: true, this returns the FQDN.
    """
    hostname = socket.gethostname()
    fqdn = socket.getfqdn()

    logger.info(f"Hostname: {hostname}")
    logger.info(f"FQDN: {fqdn}")

    # Both will be the same when setHostnameAsFQDN is true
    return fqdn

def register_with_cluster(node_id):
    """
    Register this node with the cluster coordinator.
    Many distributed systems require FQDN for node identity.
    """
    logger.info(f"Registering node: {node_id}")
    # Connect to cluster coordinator and register
    # ... implementation ...

if __name__ == "__main__":
    node_id = get_node_identity()
    register_with_cluster(node_id)

    # Start application
    # ... rest of application code ...
```

The corresponding pod manifest:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: python-cluster-node
spec:
  hostname: node-01
  subdomain: python-cluster
  setHostnameAsFQDN: true
  containers:
  - name: app
    image: python:3.11
    command: ["python", "/app/app.py"]
    volumeMounts:
    - name: app-code
      mountPath: /app
  volumes:
  - name: app-code
    configMap:
      name: python-app
```

## Debugging and Verification

Verify that the FQDN is set correctly:

```bash
# Exec into the pod
kubectl exec -it python-cluster-node -- /bin/bash

# Inside the container
hostname
# Should output: node-01.python-cluster.default.svc.cluster.local

hostname -f
# Should also output: node-01.python-cluster.default.svc.cluster.local

# Check /etc/hosts
cat /etc/hosts
# Should have an entry mapping the FQDN to the pod IP
```

Check DNS resolution:

```bash
# From inside the pod
nslookup $(hostname)
# Should resolve to the pod's IP

# From another pod
kubectl run -it --rm test --image=busybox --restart=Never -- \
  nslookup node-01.python-cluster.default.svc.cluster.local
```

## Limitations and Considerations

The FQDN hostname can be longer than 64 characters, which might cause issues with some applications that expect short hostnames. Plan your naming scheme accordingly.

Some applications parse the hostname and expect a simple name without dots. Test your application before enabling this in production.

The field requires Kubernetes 1.22 or later. Check your cluster version:

```bash
kubectl version --short
```

When using this with StatefulSets, the FQDN includes the pod ordinal, so `cassandra-0` becomes `cassandra-0.cassandra.default.svc.cluster.local`. Ensure your application handles ordinal-based naming.

Environment variables that rely on hostname might need adjustment. For example, if you construct connection strings using the hostname, verify they work with FQDNs.

## Best Practices

Only enable `setHostnameAsFQDN` when your application specifically requires it. Most cloud-native applications work fine with simple hostnames.

Test the application behavior thoroughly. Some logging systems or monitoring agents might not expect FQDN hostnames and could produce noisy logs.

Document why you're using this field in your pod specification comments. Future maintainers need to understand the requirement.

Use it consistently across all pods in a cluster application. Mixing FQDN and simple hostnames in the same cluster can lead to confusion.

Combine with proper DNS configuration. Ensure your cluster DNS is working correctly before relying on FQDN hostnames.

The `setHostnameAsFQDN` field bridges the gap between traditional infrastructure and cloud-native environments, making it easier to run legacy applications in Kubernetes without significant code changes.
