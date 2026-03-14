# How to Fix MySQL Replication Problems Caused by Calico Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MySQL, Replication, Networking, Troubleshooting

Description: Fix MySQL replication failures in Calico clusters by adding network policy rules for port 3306, restoring BGP routes between nodes, and ensuring stable pod IPs for replication connections.

---

## Introduction

MySQL replication problems caused by Calico networking require fixing the specific networking layer that was identified during diagnosis: adding missing network policy rules for port 3306, restoring BGP routes between nodes if cross-node communication is broken, or stabilizing pod IP addresses so replication connections are not disrupted by pod restarts.

## Prerequisites

- Kubernetes cluster with Calico and MySQL deployed
- `calicoctl` and `kubectl` with admin access
- MySQL admin access to verify replication status

## Step 1: Fix - Add Network Policy Rules for MySQL Replication

If network policies are blocking port 3306 between replica and primary pods.

```yaml
# fix-mysql-replication-policy.yaml
# Allows MySQL replication traffic between primary and replica pods
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-mysql-replication
  namespace: database
spec:
  order: 100
  # Apply to the primary pod
  selector: app == "mysql" && role == "primary"
  ingress:
    # Allow connections from replica pods on MySQL port
    - action: Allow
      protocol: TCP
      source:
        selector: app == "mysql" && role == "replica"
      destination:
        ports: [3306]
    # Allow connections from monitoring tools
    - action: Allow
      protocol: TCP
      source:
        selector: app == "mysql-exporter"
      destination:
        ports: [3306]
```

```bash
# Apply the network policy
calicoctl apply -f fix-mysql-replication-policy.yaml

# Verify policy was applied
calicoctl get networkpolicy allow-mysql-replication -n database -o yaml

# Test connectivity from replica to primary
PRIMARY_IP=$(kubectl get pod mysql-0 -n database -o jsonpath='{.status.podIP}')
kubectl exec -n database mysql-1 -- \
  timeout 5 bash -c "echo > /dev/tcp/${PRIMARY_IP}/3306" && \
  echo "Port 3306 now reachable" || echo "Still blocked"
```

## Step 2: Fix - Restore BGP Routes for Cross-Node Communication

If MySQL pods are on different nodes and BGP routes are missing, cross-node MySQL traffic will fail.

```bash
# Check BGP peer state
calicoctl node status

# If peers are not Established, fix BGP connectivity
# (see BGP peer not established fix post for detailed steps)

# After BGP is restored, verify the primary pod's route is visible from the replica's node
REPLICA_NODE=$(kubectl get pod mysql-1 -n database -o jsonpath='{.spec.nodeName}')
PRIMARY_IP=$(kubectl get pod mysql-0 -n database -o jsonpath='{.status.podIP}')

CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=${REPLICA_NODE} -o name | head -1)

kubectl exec -n calico-system "${CALICO_POD}" -- \
  ip route get "${PRIMARY_IP}"
# Should show a route to the primary pod's IP via the primary's node
```

## Step 3: Fix - Stabilize Pod IPs Using a Headless Service

MySQL replication connections use IP addresses. When pods restart and get new IPs, replication breaks. Use a headless Service with stable DNS names instead.

```yaml
# mysql-headless-service.yaml
# Provides stable DNS names for MySQL pods instead of using IP addresses
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
  namespace: database
spec:
  clusterIP: None  # Headless service - no virtual IP
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
```

```bash
# Apply the headless service
kubectl apply -f mysql-headless-service.yaml

# Reconfigure MySQL replication to use DNS names instead of IPs
# mysql-0.mysql-headless.database.svc.cluster.local
# mysql-1.mysql-headless.database.svc.cluster.local
kubectl exec -n database mysql-1 -- mysql -u root -p \
  -e "STOP REPLICA; CHANGE REPLICATION SOURCE TO SOURCE_HOST='mysql-0.mysql-headless.database.svc.cluster.local'; START REPLICA;"
```

## Step 4: Fix - Re-establish Replication After Network Disruption

After the networking fix, MySQL replication may need to be re-established if it lost too many binlog events.

```bash
# Check current replication status
kubectl exec -n database mysql-1 -- mysql -u root -p \
  -e "SHOW REPLICA STATUS\G" 2>/dev/null | \
  grep -E "Replica_IO_Running|Replica_SQL_Running|Last_Error"

# If replica is behind or has errors, reset and restart
kubectl exec -n database mysql-1 -- mysql -u root -p <<'EOF'
STOP REPLICA;
RESET REPLICA;
-- Reconfigure with current primary state
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-0.mysql-headless.database.svc.cluster.local',
  SOURCE_PORT=3306,
  SOURCE_USER='replication',
  SOURCE_PASSWORD='your-replication-password',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
EOF

# Verify replication is running
kubectl exec -n database mysql-1 -- mysql -u root -p \
  -e "SHOW REPLICA STATUS\G" | \
  grep -E "Seconds_Behind_Source|Replica_IO_Running"
```

## Best Practices

- Use headless Services with stable DNS names for MySQL pods to avoid replication breakage on pod IP changes
- Create network policy rules for MySQL ports as part of cluster bootstrapping, not reactively
- Monitor MySQL replication lag with a Prometheus MySQL exporter and alert when lag exceeds a threshold
- Test MySQL replication connectivity after any network policy changes in the database namespace

## Conclusion

Fixing MySQL replication problems in Calico clusters requires adding network policy rules for port 3306 between replica and primary pods, restoring BGP routes if cross-node traffic is broken, and using headless Services for stable DNS-based connection strings. After the networking fix, verify MySQL replication status and re-establish replication if binlog events were missed during the outage.
