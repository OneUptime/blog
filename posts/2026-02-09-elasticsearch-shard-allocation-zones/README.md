# How to Configure Elasticsearch Shard Allocation Awareness for Zone Redundancy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, High Availability, Shard Allocation, Kubernetes, Redundancy

Description: Implement Elasticsearch shard allocation awareness to distribute primary and replica shards across availability zones, ensuring cluster resilience against zone failures and maintaining data availability.

---

Elasticsearch shard allocation awareness prevents data loss during infrastructure failures by distributing shard replicas across failure domains like availability zones, racks, or data centers. Without awareness, Elasticsearch might place all copies of a shard in the same zone, meaning a single zone failure could make that data unavailable. Allocation awareness forces Elasticsearch to spread replicas across zones, ensuring at least one copy survives any single zone failure.

## Understanding Shard Allocation Awareness

Elasticsearch assigns custom attributes to each node, then uses these attributes to make intelligent shard placement decisions. When you configure zone awareness, you tell Elasticsearch which attribute represents the failure domain. The cluster then ensures that for any given shard, its replicas live in different zones than the primary.

This works through allocation filtering. When Elasticsearch needs to place a replica shard, it checks which zone holds the primary and intentionally chooses a node in a different zone. This simple rule creates powerful redundancy without manual intervention.

The key is proper node labeling. Each node must know which zone it belongs to, either through configuration or dynamic attribute discovery. In Kubernetes, this typically comes from node labels that map to cloud provider availability zones.

## Configuring Node Attributes

Set the zone attribute for each Elasticsearch node. In elasticsearch.yml:

```yaml
# Node in zone us-east-1a
node.attr.zone: us-east-1a

# Node in zone us-east-1b
node.attr.zone: us-east-1b

# Node in zone us-east-1c
node.attr.zone: us-east-1c
```

For Kubernetes deployments, use node labels to populate attributes dynamically:

```yaml
# elasticsearch-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 6
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - elasticsearch
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: cluster.name
          value: "production-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        # Set zone attribute from node label
        - name: node.attr.zone
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['topology.kubernetes.io/zone']
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: discovery.seed_hosts
          value: "elasticsearch"
```

This configuration uses the standard Kubernetes topology zone label to set each pod's zone attribute. The podAntiAffinity ensures pods spread across zones.

## Enabling Cluster-Wide Allocation Awareness

Configure the cluster to use zone attributes for allocation decisions:

```bash
# Enable zone awareness
curl -X PUT "http://elasticsearch:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.awareness.attributes": "zone"
    }
  }'
```

This tells Elasticsearch to consider the zone attribute when allocating shards. Elasticsearch will try to balance shards across zones but doesn't strictly enforce it yet.

## Forcing Allocation Across Zones

For critical data, force strict zone distribution:

```bash
# Force strict zone awareness with all three zones
curl -X PUT "http://elasticsearch:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.awareness.attributes": "zone",
      "cluster.routing.allocation.awareness.force.zone.values": "us-east-1a,us-east-1b,us-east-1c"
    }
  }'
```

With force values configured, Elasticsearch won't allocate replica shards until nodes in all specified zones are available. This prevents scenarios where all shards end up in one zone due to temporary node unavailability.

## Verifying Zone Distribution

Check shard allocation across zones:

```bash
# View shard allocation by node
curl -X GET "http://elasticsearch:9200/_cat/shards?v" | grep -E "zone|node"

# Get detailed shard allocation info
curl -X GET "http://elasticsearch:9200/_cluster/allocation/explain?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "index": "application-logs",
    "shard": 0,
    "primary": false
  }'
```

Query node attributes to confirm zone settings:

```bash
# List nodes with their zone attributes
curl -X GET "http://elasticsearch:9200/_cat/nodeattrs?v&h=node,attr,value" | grep zone
```

Expected output shows each node in a different zone:

```
node                        attr value
elasticsearch-0             zone us-east-1a
elasticsearch-1             zone us-east-1b
elasticsearch-2             zone us-east-1c
elasticsearch-3             zone us-east-1a
elasticsearch-4             zone us-east-1b
elasticsearch-5             zone us-east-1c
```

## Creating Indices with Zone Awareness

New indices automatically use zone-aware allocation. Verify with a test index:

```bash
# Create index with 3 shards and 1 replica
curl -X PUT "http://elasticsearch:9200/test-zone-aware" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    }
  }'

# Check shard distribution
curl -X GET "http://elasticsearch:9200/_cat/shards/test-zone-aware?v&h=index,shard,prirep,state,node" | \
  while read line; do
    echo "$line"
    node=$(echo "$line" | awk '{print $5}')
    curl -s "http://elasticsearch:9200/_cat/nodeattrs?h=node,attr,value" | grep "$node" | grep zone
  done
```

For each shard, the primary and replica should be in different zones.

## Handling Zone Failures

Simulate a zone failure to test resilience:

```bash
# Cordon nodes in zone us-east-1a (prevents new pod scheduling)
kubectl cordon $(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o name)

# Delete pods in that zone
kubectl delete pods -n logging -l app=elasticsearch --field-selector spec.nodeName=$(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o jsonpath='{.items[*].metadata.name}')

# Check cluster health
curl -X GET "http://elasticsearch:9200/_cluster/health?pretty"
```

With proper zone awareness, the cluster remains green or yellow (not red) because replica shards in other zones can serve all data.

Monitor shard reallocation:

```bash
# Watch shard recovery
watch 'curl -s "http://elasticsearch:9200/_cat/recovery?v&h=index,shard,stage,type,source_node,target_node" | grep -v done'

# Check cluster state during recovery
curl -X GET "http://elasticsearch:9200/_cluster/health?wait_for_status=yellow&timeout=5m"
```

Elasticsearch automatically promotes replica shards in surviving zones to primary status.

## Multi-Attribute Awareness

Use multiple attributes for fine-grained control:

```yaml
# Node configuration with zone and rack attributes
node.attr.zone: us-east-1a
node.attr.rack: rack-1
```

Configure cluster to use both:

```bash
# Enable awareness for zone and rack
curl -X PUT "http://elasticsearch:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.awareness.attributes": "zone,rack"
    }
  }'
```

This creates two levels of separation. Replicas prefer different zones, but within a zone, they prefer different racks.

## Index-Level Allocation Control

Override cluster settings for specific indices:

```bash
# Create index that must span all zones
curl -X PUT "http://elasticsearch:9200/critical-data" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 6,
      "number_of_replicas": 2,
      "index.routing.allocation.include._tier_preference": "data_hot",
      "index.routing.allocation.total_shards_per_node": 2
    }
  }'
```

The total_shards_per_node setting prevents too many shards of one index from landing on a single node, further improving distribution.

## Monitoring Zone Balance

Create alerts for unbalanced shard distribution:

```bash
# Check shard count per zone
curl -X GET "http://elasticsearch:9200/_cat/shards" | \
  while read index shard prirep state docs size ip node; do
    zone=$(curl -s "http://elasticsearch:9200/_cat/nodeattrs?h=node,value" | grep "$node" | awk '{print $2}')
    echo "$index,$shard,$prirep,$zone"
  done | \
  awk -F, '{zones[$4]++} END {for (z in zones) print z, zones[z]}' | \
  sort -k2 -n
```

This shows shard counts per zone. Significant imbalance indicates allocation issues.

Set up Watcher alert:

```bash
# Alert on zone imbalance
curl -X PUT "http://elasticsearch:9200/_watcher/watch/zone-imbalance" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": {
      "schedule": {
        "interval": "10m"
      }
    },
    "input": {
      "http": {
        "request": {
          "host": "localhost",
          "port": 9200,
          "path": "/_cat/shards?format=json"
        }
      }
    },
    "condition": {
      "script": {
        "source": "def zoneCounts = [:]; for (shard in ctx.payload) { def node = shard.node; def zone = ctx.payload._nodes.find{it.name == node}?.attributes?.zone; zoneCounts[zone] = (zoneCounts[zone] ?: 0) + 1; }; def max = zoneCounts.values().max(); def min = zoneCounts.values().min(); return (max - min) > 10;",
        "lang": "painless"
      }
    },
    "actions": {
      "log_alert": {
        "logging": {
          "text": "Shard distribution across zones is imbalanced"
        }
      }
    }
  }'
```

## Kubernetes Operator Zone Configuration

If using Elastic Cloud on Kubernetes (ECK), configure zone awareness declaratively:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: logging
spec:
  version: 8.11.0
  nodeSets:
  - name: zone-a
    count: 2
    config:
      node.attr.zone: us-east-1a
      cluster.routing.allocation.awareness.attributes: zone
    podTemplate:
      spec:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                  - us-east-1a
  - name: zone-b
    count: 2
    config:
      node.attr.zone: us-east-1b
      cluster.routing.allocation.awareness.attributes: zone
    podTemplate:
      spec:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                  - us-east-1b
  - name: zone-c
    count: 2
    config:
      node.attr.zone: us-east-1c
      cluster.routing.allocation.awareness.attributes: zone
    podTemplate:
      spec:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                  - us-east-1c
```

ECK handles the complexity of managing multiple node sets with zone-specific configuration.

## Troubleshooting Allocation Issues

If shards don't distribute across zones as expected:

```bash
# Check why a shard isn't allocated
curl -X GET "http://elasticsearch:9200/_cluster/allocation/explain?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "index": "application-logs",
    "shard": 0,
    "primary": false
  }'

# View all allocation decisions
curl -X GET "http://elasticsearch:9200/_cat/allocation?v"

# Check for forced allocation settings interfering
curl -X GET "http://elasticsearch:9200/_cluster/settings?include_defaults=true&pretty" | \
  grep -A 5 "allocation"
```

Common issues include insufficient replica count (need at least 2 replicas for 3-zone redundancy), misconfigured node attributes, or conflicting allocation rules.

## Conclusion

Shard allocation awareness transforms Elasticsearch from a cluster that might fail completely during zone outages to one that survives infrastructure failures gracefully. By configuring node attributes, enabling awareness at the cluster level, and forcing distribution across zones, you ensure your data remains available even when entire availability zones become unreachable. Test your configuration by simulating zone failures in non-production environments, then monitor shard distribution continuously to catch allocation problems before they impact availability. This investment in resilience pays for itself the first time a zone failure occurs and your services continue running without interruption.
