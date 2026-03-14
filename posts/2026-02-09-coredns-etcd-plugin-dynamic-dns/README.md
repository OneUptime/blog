# How to Use CoreDNS Etcd Plugin for Dynamic DNS Record Management in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Etcd, DNS

Description: Learn how to configure the CoreDNS etcd plugin to manage dynamic DNS records programmatically, enabling runtime DNS modifications without CoreDNS restarts for flexible service discovery patterns.

---

The CoreDNS etcd plugin provides dynamic DNS record management by storing DNS data in etcd. Unlike static configuration files, etcd-backed DNS records can be created, updated, and deleted at runtime without restarting CoreDNS. This enables programmatic DNS management for dynamic service registration, external integrations, and automated DNS workflows.

This guide shows you how to implement dynamic DNS record management using the CoreDNS etcd plugin.

## Understanding the Etcd Plugin

The etcd plugin stores DNS records in etcd key-value store with these advantages:

- Dynamic record updates without CoreDNS restart
- Programmatic DNS record management via etcd API
- High availability through etcd clustering
- Watch-based automatic reloading
- Support for all DNS record types

Use cases include:

- Dynamic service registration
- External service integration
- Temporary DNS overrides
- A/B testing and canary deployments
- Automated DNS management systems

## Basic Etcd Plugin Configuration

First, deploy etcd in your cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-cluster
  namespace: kube-system
spec:
  clusterIP: None
  selector:
    app: etcd
  ports:
  - port: 2379
    name: client
  - port: 2380
    name: peer
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
  namespace: kube-system
spec:
  serviceName: etcd-cluster
  replicas: 3
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
    spec:
      containers:
      - name: etcd
        image: quay.io/coreos/etcd:v3.5.9
        ports:
        - containerPort: 2379
          name: client
        - containerPort: 2380
          name: peer
        env:
        - name: ETCD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ETCD_INITIAL_CLUSTER
          value: "etcd-0=http://etcd-0.etcd-cluster:2380,etcd-1=http://etcd-1.etcd-cluster:2380,etcd-2=http://etcd-2.etcd-cluster:2380"
        - name: ETCD_INITIAL_CLUSTER_STATE
          value: "new"
        - name: ETCD_INITIAL_CLUSTER_TOKEN
          value: "etcd-cluster"
        - name: ETCD_LISTEN_CLIENT_URLS
          value: "http://0.0.0.0:2379"
        - name: ETCD_LISTEN_PEER_URLS
          value: "http://0.0.0.0:2380"
        - name: ETCD_ADVERTISE_CLIENT_URLS
          value: "http://$(ETCD_NAME).etcd-cluster:2379"
        - name: ETCD_INITIAL_ADVERTISE_PEER_URLS
          value: "http://$(ETCD_NAME).etcd-cluster:2380"
        volumeMounts:
        - name: data
          mountPath: /var/lib/etcd
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Configure CoreDNS to use etcd:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Dynamic DNS zone using etcd
    dynamic.local:53 {
        errors
        log

        etcd dynamic.local {
            path /coredns
            endpoint http://etcd-cluster.kube-system:2379
            fallthrough
        }

        cache 30
    }

    # Standard cluster DNS
    cluster.local:53 {
        errors
        cache 30
        kubernetes cluster.local {
           pods insecure
           ttl 30
        }
    }

    .:53 {
        errors
        health
        ready
        kubernetes cluster.local {
           pods insecure
           fallthrough
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
    }
```

Apply configuration:

```bash
kubectl apply -f etcd-statefulset.yaml
kubectl apply -f coredns-config.yaml
kubectl rollout restart deployment coredns -n kube-system
```

## Managing DNS Records via Etcd

Add DNS records using etcdctl or API:

```bash
# Install etcdctl in a pod
kubectl run etcdctl --image=quay.io/coreos/etcd:v3.5.9 --rm -it -- sh

# Inside the pod, set environment
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=http://etcd-cluster.kube-system:2379

# Add A record
etcdctl put /coredns/dynamic.local/test '{"host":"10.0.0.100","ttl":60}'

# Add multiple A records (round-robin)
etcdctl put /coredns/dynamic.local/api '{"host":"10.0.0.10","ttl":60}'
etcdctl put /coredns/dynamic.local/api/001 '{"host":"10.0.0.11","ttl":60}'
etcdctl put /coredns/dynamic.local/api/002 '{"host":"10.0.0.12","ttl":60}'

# Add SRV record
etcdctl put /coredns/dynamic.local/service/_http._tcp '{"host":"service.local","port":8080,"priority":10,"weight":100,"ttl":60}'

# Add TXT record
etcdctl put /coredns/dynamic.local/txt/verification '{"text":"verification-token-12345","ttl":300}'
```

Test record resolution:

```bash
kubectl run test --image=nicolaka/netshoot --rm -it -- nslookup test.dynamic.local
kubectl run test --image=nicolaka/netshoot --rm -it -- nslookup api.dynamic.local
```

## Programmatic DNS Management

Create a controller to manage DNS records:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
)

type DNSRecord struct {
    Host string `json:"host"`
    TTL  int    `json:"ttl"`
}

type DNSManager struct {
    client *clientv3.Client
    prefix string
}

func NewDNSManager(endpoints []string, prefix string) (*DNSManager, error) {
    client, err := clientv3.New(clientv3.Config{
        Endpoints:   endpoints,
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        return nil, err
    }

    return &DNSManager{
        client: client,
        prefix: prefix,
    }, nil
}

func (dm *DNSManager) AddRecord(zone, name, ip string, ttl int) error {
    record := DNSRecord{
        Host: ip,
        TTL:  ttl,
    }

    data, err := json.Marshal(record)
    if err != nil {
        return err
    }

    key := fmt.Sprintf("%s/%s/%s", dm.prefix, zone, name)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err = dm.client.Put(ctx, key, string(data))
    return err
}

func (dm *DNSManager) DeleteRecord(zone, name string) error {
    key := fmt.Sprintf("%s/%s/%s", dm.prefix, zone, name)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err := dm.client.Delete(ctx, key)
    return err
}

func (dm *DNSManager) ListRecords(zone string) (map[string]DNSRecord, error) {
    prefix := fmt.Sprintf("%s/%s/", dm.prefix, zone)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := dm.client.Get(ctx, prefix, clientv3.WithPrefix())
    if err != nil {
        return nil, err
    }

    records := make(map[string]DNSRecord)
    for _, kv := range resp.Kvs {
        var record DNSRecord
        if err := json.Unmarshal(kv.Value, &record); err != nil {
            continue
        }
        records[string(kv.Key)] = record
    }

    return records, nil
}

func main() {
    endpoints := []string{"http://etcd-cluster.kube-system:2379"}
    dm, err := NewDNSManager(endpoints, "/coredns")
    if err != nil {
        panic(err)
    }

    // Add record
    err = dm.AddRecord("dynamic.local", "myservice", "10.0.0.50", 60)
    if err != nil {
        fmt.Printf("Error adding record: %v\n", err)
    } else {
        fmt.Println("Record added successfully")
    }

    // List records
    records, err := dm.ListRecords("dynamic.local")
    if err != nil {
        fmt.Printf("Error listing records: %v\n", err)
    } else {
        fmt.Printf("Found %d records\n", len(records))
        for key, record := range records {
            fmt.Printf("  %s -> %s (TTL: %d)\n", key, record.Host, record.TTL)
        }
    }
}
```

## Dynamic Service Registration

Implement automatic service registration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-registrar
data:
  register.sh: |
    #!/bin/bash

    ETCD_ENDPOINT="http://etcd-cluster.kube-system:2379"
    ZONE="dynamic.local"
    PREFIX="/coredns/${ZONE}"

    # Watch for service changes
    kubectl get svc --all-namespaces -w --output-watch-events | while read -r event type namespace name rest; do
        if [[ "$type" == "Service" ]]; then
            # Get service details
            CLUSTER_IP=$(kubectl get svc "$name" -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)

            if [[ -n "$CLUSTER_IP" && "$CLUSTER_IP" != "None" ]]; then
                # Register service
                KEY="${PREFIX}/${namespace}.${name}"
                VALUE="{\"host\":\"${CLUSTER_IP}\",\"ttl\":60}"

                echo "$(date): Registering ${namespace}.${name}.${ZONE} -> ${CLUSTER_IP}"

                curl -X PUT "${ETCD_ENDPOINT}/v2/keys${KEY}" \
                    -d value="${VALUE}" \
                    --silent --output /dev/null
            fi
        fi
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-registrar
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-registrar
  template:
    metadata:
      labels:
        app: service-registrar
    spec:
      serviceAccountName: service-registrar
      containers:
      - name: registrar
        image: bitnami/kubectl:latest
        command:
        - sh
        - /scripts/register.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: service-registrar
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: service-registrar
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: service-registrar
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: service-registrar
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: service-registrar
subjects:
- kind: ServiceAccount
  name: service-registrar
  namespace: kube-system
```

## Testing Dynamic DNS Updates

Create comprehensive tests:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dynamic-dns-test
data:
  test.sh: |
    #!/bin/bash

    ETCD_ENDPOINT="http://etcd-cluster.kube-system:2379"
    ZONE="dynamic.local"
    TEST_NAME="test-$(date +%s)"

    echo "Testing dynamic DNS with etcd..."

    # Test 1: Add record via etcd
    echo "Test 1: Adding DNS record"
    KEY="/coredns/${ZONE}/${TEST_NAME}"
    VALUE='{"host":"10.0.0.99","ttl":60}'

    curl -X PUT "${ETCD_ENDPOINT}/v2/keys${KEY}" -d value="${VALUE}"

    # Wait for propagation
    sleep 3

    # Test 2: Resolve added record
    echo "Test 2: Resolving new record"
    if nslookup "${TEST_NAME}.${ZONE}" | grep -q "10.0.0.99"; then
        echo "PASS: Record resolves correctly"
    else
        echo "FAIL: Record not found"
    fi

    # Test 3: Update record
    echo "Test 3: Updating record"
    VALUE='{"host":"10.0.0.100","ttl":60}'
    curl -X PUT "${ETCD_ENDPOINT}/v2/keys${KEY}" -d value="${VALUE}"

    sleep 3

    if nslookup "${TEST_NAME}.${ZONE}" | grep -q "10.0.0.100"; then
        echo "PASS: Record updated successfully"
    else
        echo "FAIL: Record update failed"
    fi

    # Test 4: Delete record
    echo "Test 4: Deleting record"
    curl -X DELETE "${ETCD_ENDPOINT}/v2/keys${KEY}"

    sleep 3

    if nslookup "${TEST_NAME}.${ZONE}" 2>&1 | grep -q "NXDOMAIN\|can't find"; then
        echo "PASS: Record deleted successfully"
    else
        echo "FAIL: Record still exists"
    fi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-dynamic-dns
spec:
  template:
    spec:
      containers:
      - name: test
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/test.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: dynamic-dns-test
      restartPolicy: Never
```

## Best Practices

Follow these guidelines for etcd-backed DNS:

1. Use etcd clustering for high availability
2. Set appropriate TTL values for records
3. Implement record cleanup for deleted services
4. Monitor etcd performance and storage
5. Back up etcd data regularly
6. Use watch-based updates for efficiency
7. Implement access control for etcd
8. Document DNS record schema
9. Version control DNS management code
10. Test failover scenarios

The CoreDNS etcd plugin enables dynamic DNS record management that adapts to changing infrastructure without restarts. By leveraging etcd's reliability and watch capabilities, you can build sophisticated DNS automation systems that integrate seamlessly with Kubernetes workloads and external services.

For more CoreDNS patterns, explore our guides on [CoreDNS federation](https://oneuptime.com/blog/post/2026-02-09-coredns-federation-multi-cluster/view) and [custom DNS configuration](https://oneuptime.com/blog/post/2026-02-09-custom-dns-resolvers-pod-dnsconfig/view).
