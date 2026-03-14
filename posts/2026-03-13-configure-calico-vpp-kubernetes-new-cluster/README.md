# How to Configure Calico VPP on Kubernetes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Configuration

Description: A guide to configuring Calico VPP's data plane, memory settings, interface binding, and performance parameters for a new Kubernetes cluster.

---

## Introduction

Calico VPP configuration covers two distinct layers: the Calico control plane (IP pools, BGP, Felix) and the VPP data plane (interface configuration, memory pools, CPU pinning, and buffer sizes). The Calico control plane is configured using the same CRDs as standard Calico, while VPP-specific settings are managed through Kubernetes ConfigMaps and the VPP startup configuration file.

Getting VPP configuration right from the start is critical because many VPP parameters — particularly hugepages and CPU affinity — require node reboots or pod restarts to take effect. Planning your VPP configuration before initial deployment avoids the need for disruptive reconfigurations later.

## Prerequisites

- Calico VPP installed on a Kubernetes cluster
- `kubectl` and `calicoctl` installed
- Nodes with hugepages configured

## Step 1: Configure IP Pool for VPP

Calico VPP supports VXLAN and IP-in-IP encapsulation. For best performance without a special hardware, use VXLAN.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 2: Configure VPP Startup via ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vpp-config
  namespace: calico-vpp-dataplane
data:
  vpp.conf: |
    unix {
      nodaemon
      log /var/log/vpp/vpp.log
      full-coredump
      cli-listen /run/vpp/cli.sock
    }
    dpdk {
      dev 0000:01:00.0
      uio-driver vfio-pci
    }
    buffers {
      buffers-per-numa 128000
    }
    cpu {
      workers 2
      main-core 0
    }
    api-segment {
      gid vpp
    }
```

```bash
kubectl apply -f vpp-config.yaml
```

## Step 3: Configure the VPP Manager

Update the VPP Manager ConfigMap with your interface details.

```bash
kubectl patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --patch '{"data":{"CALICOVPP_INTERFACE":"eth1","CALICOVPP_NATIVE_DRIVER":"af_packet"}}'
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
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show ip table
```

## Step 6: Tune VPP Buffer Sizes

For high-throughput workloads, increase VPP's buffer pool.

```yaml
# In vpp.conf
buffers {
  buffers-per-numa 256000
  page-size 2m
}
```

## Conclusion

Configuring Calico VPP for a new cluster requires setting up the Calico control plane (IP pools, Felix) the same way as standard Calico, while configuring VPP-specific settings — interface binding, hugepages, buffer sizes, and CPU pinning — through ConfigMaps and the VPP startup file. Getting these settings right before initial deployment avoids the need for disruptive reconfigurations that require pod restarts.
