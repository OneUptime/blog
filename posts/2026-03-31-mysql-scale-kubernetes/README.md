# How to Scale MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Scaling, StatefulSet, Replication

Description: Scale MySQL read capacity on Kubernetes by adding replicas to a StatefulSet and routing read traffic to secondary pods using MySQL Router or ProxySQL.

---

Scaling MySQL on Kubernetes differs from stateless applications. You cannot simply increase StatefulSet replicas and expect all pods to share the same data - each MySQL pod maintains its own copy. Scaling MySQL means adding read replicas that replicate from a primary, then routing read traffic across them.

## Scaling Read Replicas with a StatefulSet

If you are using MySQL InnoDB Cluster or Group Replication, adding a replica involves scaling the StatefulSet and joining the new pod to the cluster:

```bash
# Scale the StatefulSet from 3 to 5 replicas
kubectl scale statefulset mysql --replicas=5 -n mysql-cluster

# Watch the new pods start
kubectl get pods -n mysql-cluster -w
```

After the new pods start, they need to join the replication group. With the MySQL Operator, this happens automatically. For manual setups, use MySQL Shell:

```bash
kubectl exec -it mysql-0 -n mysql-cluster -- mysqlsh --uri root@localhost --password=secret
```

```javascript
var cluster = dba.getCluster('myCluster');
cluster.addInstance('root@mysql-3.mysql-headless.mysql-cluster.svc.cluster.local:3306', {
  password: 'secret',
  recoveryMethod: 'clone'
});
cluster.status();
```

## Horizontal Pod Autoscaler for MySQL Router

While you cannot autoscale MySQL data pods without coordination, you can autoscale the MySQL Router tier that sits in front of the cluster:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mysql-router-hpa
  namespace: mysql-cluster
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mysql-router
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## ProxySQL for Read/Write Splitting

ProxySQL can distribute read queries across replicas automatically:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxysql
  namespace: mysql-cluster
spec:
  replicas: 2
  selector:
    matchLabels:
      app: proxysql
  template:
    metadata:
      labels:
        app: proxysql
    spec:
      containers:
      - name: proxysql
        image: proxysql/proxysql:2.6
        ports:
        - containerPort: 6033
        - containerPort: 6032
        volumeMounts:
        - name: config
          mountPath: /etc/proxysql.cnf
          subPath: proxysql.cnf
      volumes:
      - name: config
        configMap:
          name: proxysql-config
```

Configure ProxySQL to separate reads from writes:

```text
mysql_servers =
(
  { address="mysql-0.mysql-headless", port=3306, hostgroup=10, comment="primary" },
  { address="mysql-1.mysql-headless", port=3306, hostgroup=20, comment="replica" },
  { address="mysql-2.mysql-headless", port=3306, hostgroup=20, comment="replica" }
)

mysql_query_rules =
(
  { rule_id=1, active=1, match_pattern="^SELECT.*FOR UPDATE", destination_hostgroup=10, apply=1 },
  { rule_id=2, active=1, match_pattern="^SELECT", destination_hostgroup=20, apply=1 }
)
```

## Vertical Scaling

To increase CPU or memory for MySQL pods, update the StatefulSet resource limits. Rolling updates to StatefulSets restart one pod at a time:

```bash
kubectl patch statefulset mysql -n mysql-cluster --type=json -p='[
  {"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/memory","value":"4Gi"},
  {"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"8Gi"}
]'
```

## Summary

Scaling MySQL on Kubernetes means adding read replicas to increase query throughput, not simply increasing pod count. Use MySQL InnoDB Cluster with the MySQL Operator to automate replica provisioning, and deploy ProxySQL or MySQL Router to distribute read traffic. Autoscale the proxy tier with HPA to handle traffic spikes, and use vertical scaling via StatefulSet resource patches to give individual MySQL pods more CPU and memory when needed.
