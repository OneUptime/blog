# How to Tune Calico on OpenStack DevStack for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Performance, Configuration

Description: A guide to configuring DevStack with Calico to simulate production performance characteristics for testing.

---

## Introduction

DevStack is not a production environment, but you can configure it to test production-like Calico settings before applying them to real clusters. Tuning DevStack to simulate production characteristics - realistic Felix timers, production-like IP pool sizes, and optimized etcd configuration - lets you validate that your production configuration doesn't break basic functionality before deploying it.

This approach is particularly useful for testing Felix timer changes, as timer misconfigurations can cause subtle issues like slow policy propagation or excessive CPU usage that are easier to detect in a controlled DevStack environment than in production.

## Prerequisites

- DevStack with Calico installed
- Root access to the DevStack VM

## Step 1: Apply Production-Like Felix Configuration

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "iptablesRefreshInterval": "90s",
    "routeRefreshInterval": "60s",
    "reportingInterval": "120s",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 2: Configure Production IP Pool Settings

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"blockSize":26,"encapsulation":"None"}}'
```

## Step 3: Test Policy Convergence Time

Apply a new Security Group rule and measure how long it takes Felix to program iptables.

```bash
TIME_BEFORE=$(date +%s%N)
openstack security group rule create --protocol tcp --dst-port 8080 test-sg
# Check when iptables rule appears
while ! sudo iptables -L | grep -q "dpt:8080"; do sleep 0.1; done
TIME_AFTER=$(date +%s%N)
echo "Policy convergence: $(( ($TIME_AFTER - $TIME_BEFORE) / 1000000 )) ms"
```

## Step 4: Simulate Load with Multiple VMs

```bash
for i in {1..5}; do
  openstack server create --network devstack-net \
    --image cirros --flavor cirros256 load-vm-$i
done
openstack server list
```

Monitor Felix CPU during VM creation:

```bash
watch "sudo systemctl status devstack@calico-felix | grep CPU"
```

## Step 5: Test etcd Under Load

```bash
# Check etcd write latency during VM creation
ETCDCTL_API=3 etcdctl --endpoints=http://127.0.0.1:2379 \
  check perf
```

## Step 6: Validate Prometheus Metrics

```bash
curl -s http://127.0.0.1:9091/metrics | grep felix_
```

Confirm `felix_exec_time_seconds` is within expected bounds.

## Conclusion

Tuning DevStack to simulate production Calico settings - production Felix timers, realistic IP pool configuration, and load simulation with multiple VMs - validates that configuration changes work correctly before production deployment. The ability to measure policy convergence time and observe Felix CPU usage under load makes DevStack a valuable pre-production testing environment for Calico configuration tuning.
