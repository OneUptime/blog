# How to Prevent MySQL Replication Problems in Calico Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MySQL, Replication, Prevention, Network Policy

Description: Prevent MySQL replication failures in Calico clusters by designing correct network policies for port 3306, using stable DNS names, and testing replication connectivity proactively.

---

## Introduction

MySQL replication failures in Calico clusters are almost always preventable by addressing two risk factors: network policies that block port 3306 between replica and primary pods, and pod IP instability that breaks hardcoded IP-based replication connections. Both risks are eliminated with correct initial configuration.

## Prerequisites

- Calico cluster with MySQL deployed or planned
- `calicoctl` and `kubectl` access
- MySQL admin access

## Step 1: Design Network Policies for MySQL From Day One

Create MySQL-specific network policies before any default-deny policies are applied to the database namespace.

```yaml
# mysql-network-policies.yaml
# Network policies for MySQL primary-replica replication
---
# Allow replication connections to the primary
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: mysql-primary-allow-replica
  namespace: database
spec:
  order: 50
  selector: app == "mysql" && role == "primary"
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == "mysql" && role == "replica"
      destination:
        ports: [3306]
    - action: Allow
      protocol: TCP
      source:
        selector: app == "mysql-exporter"
      destination:
        ports: [3306]
---
# Allow replicas to connect to the primary
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: mysql-replica-allow-replication-egress
  namespace: database
spec:
  order: 50
  selector: app == "mysql" && role == "replica"
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: app == "mysql" && role == "primary"
        ports: [3306]
```

```bash
# Apply MySQL network policies BEFORE any default-deny policy
calicoctl apply -f mysql-network-policies.yaml

# Verify policies are in place
calicoctl get networkpolicies -n database
```

## Step 2: Use Headless Services for Stable DNS-Based Connections

Configure MySQL replication to use stable DNS names rather than pod IPs.

```yaml
# mysql-headless-service.yaml
# Provides stable DNS names for MySQL StatefulSet pods
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
  namespace: database
spec:
  clusterIP: None  # Headless - provides per-pod DNS entries
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
```

```bash
# Create headless service
kubectl apply -f mysql-headless-service.yaml

# Verify DNS works for each pod
PRIMARY_DNS="mysql-0.mysql-headless.database.svc.cluster.local"
kubectl run dns-test --image=busybox --rm -it --restart=Never -- \
  nslookup "${PRIMARY_DNS}"
```

Configure MySQL replication to use the DNS name.

```bash
# Configure replication using DNS name (stable across pod restarts)
kubectl exec -n database mysql-1 -- mysql -u root -p <<'EOF'
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-0.mysql-headless.database.svc.cluster.local',
  SOURCE_PORT=3306,
  SOURCE_USER='replication',
  SOURCE_PASSWORD='secure-password',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
SHOW REPLICA STATUS\G
EOF
```

## Step 3: Test Replication Connectivity Before Production

Validate MySQL replication connectivity in staging before production deployment.

```bash
#!/bin/bash
# test-mysql-replication-connectivity.sh
# Run before applying default-deny policies to database namespace

PRIMARY_POD="mysql-0"
REPLICA_POD="mysql-1"
NAMESPACE="database"

# Test TCP 3306 connectivity
PRIMARY_IP=$(kubectl get pod ${PRIMARY_POD} -n ${NAMESPACE} -o jsonpath='{.status.podIP}')
kubectl exec -n ${NAMESPACE} ${REPLICA_POD} -- \
  timeout 5 bash -c "echo > /dev/tcp/${PRIMARY_IP}/3306" && \
  echo "OK: Port 3306 reachable from replica to primary" || \
  echo "FAIL: Port 3306 blocked - check network policies"

# Verify MySQL replication is working
kubectl exec -n ${NAMESPACE} ${REPLICA_POD} -- \
  mysql -u root -ppassword \
  -e "SHOW REPLICA STATUS\G" 2>/dev/null | \
  grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master"
```

## Step 4: Monitor Replication Health Continuously

Set up monitoring that detects replication problems before they impact applications.

```yaml
# mysql-replication-monitor.yaml
# CronJob that periodically validates MySQL replication connectivity
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-replication-monitor
  namespace: database
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: monitor
              image: nicolaka/netshoot
              command:
                - /bin/bash
                - -c
                - |
                  PRIMARY="mysql-0.mysql-headless.database.svc.cluster.local"
                  if timeout 5 bash -c "echo > /dev/tcp/${PRIMARY}/3306"; then
                    echo "OK: MySQL primary reachable on port 3306"
                  else
                    echo "ALERT: MySQL primary NOT reachable on port 3306"
                    exit 1
                  fi
          restartPolicy: Never
```

## Best Practices

- Create MySQL network policies before any default-deny policies are applied to the namespace
- Always use headless Services and DNS-based connection strings for MySQL replication
- Test port 3306 connectivity between all MySQL pods as part of StatefulSet deployment validation
- Run a replication connectivity monitor CronJob to detect network policy regressions early
- Include MySQL replication network policies in your infrastructure-as-code templates so they are applied consistently across environments

## Conclusion

Preventing MySQL replication problems in Calico clusters requires creating correct network policies for port 3306 before deploying default-deny policies, using stable DNS names via headless Services instead of pod IPs, and continuously monitoring replication connectivity. These preventive measures eliminate the two most common networking root causes of MySQL replication failures.
