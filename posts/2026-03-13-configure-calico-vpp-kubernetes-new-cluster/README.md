# How to Configure Calico VPP on Kubernetes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Configuration

Description: A guide to configuring Calico VPP's data plane, memory settings, interface binding, and performance parameters for a new Kubernetes cluster.

---

## Introduction

Calico VPP configuration covers two distinct layers: the Calico control plane (IP pools, BGP, Felix) and the VPP data plane (interface configuration, memory pools, CPU pinning, and buffer sizes). The Calico control plane is configured using the same CRDs as standard Calico, while VPP-specific settings are managed through Kubernetes ConfigMaps and the VPP startup configuration file.

Getting VPP configuration right from the start is critical because many VPP parameters - particularly hugepages and CPU affinity - require node reboots or pod restarts to take effect. Planning your VPP configuration before initial deployment avoids the need for disruptive reconfigurations later.

## Prerequisites

- Calico VPP installed on a Kubernetes cluster
- `kubectl` and `calicoctl` installed
- Nodes with hugepages configured

## Step 1: Configure IP Pool for VPP

Calico VPP supports VXLAN and IP-in-IP encapsulation. For an overlay that works across Layer 3 networks without special hardware, use VXLAN.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 2: Configure VPP Startup via ConfigMap

```yaml
data:
  CALICOVPP_CONFIG_TEMPLATE: |-
    unix {
      nodaemon
      full-coredump
      cli-listen /var/run/vpp/cli.sock
      pidfile /run/vpp/vpp.pid
      exec /etc/vpp/startup.exec
    }
    api-trace { on }
    cpu {
      workers 2
      main-core 0
    }
    socksvr {
      socket-name /var/run/vpp/vpp-api.sock
    }
    plugins {
      plugin default { enable }
      plugin dpdk_plugin.so { disable }
      plugin calico_plugin.so { enable }
      plugin ping_plugin.so { disable }
      plugin dispatch_trace_plugin.so { enable }
    }
    buffers {
      buffers-per-numa 128000
    }
```

```bash
kubectl patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --type merge \
  --patch-file calico-vpp-config-template.yaml
```

## Step 3: Configure the VPP Manager

Update the VPP Manager ConfigMap with your interface details.

```bash
kubectl patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --type merge \
  --patch '{"data":{"CALICOVPP_INTERFACES":"{\"uplinkInterfaces\":[{\"interfaceName\":\"eth1\",\"vppDriver\":\"af_packet\"}]}"}}'
```

## Step 4: Configure Felix

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 5: Verify VPP Interface Configuration

```bash
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show ip table
```

## Step 6: Tune VPP Buffer Sizes

For high-throughput workloads, increase VPP's buffer pool.

```yaml
# In vpp.conf

buffers {
  buffers-per-numa 256000
  page-size 2M
}
```

## Conclusion

Configuring Calico VPP for a new cluster requires setting up the Calico control plane (IP pools, Felix) the same way as standard Calico, while configuring VPP-specific settings - interface binding, hugepages, buffer sizes, and CPU pinning - through ConfigMaps and the VPP startup file. Getting these settings right before initial deployment avoids the need for disruptive reconfigurations that require pod restarts.
