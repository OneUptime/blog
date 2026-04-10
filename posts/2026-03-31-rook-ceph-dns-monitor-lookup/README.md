# How to Look Up Ceph Monitors Through DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, DNS, Monitor, Network, Configuration

Description: Learn how to configure Ceph to discover monitors through DNS SRV records, eliminating hardcoded IP addresses in ceph.conf for dynamic and cloud environments.

---

## DNS-Based Monitor Discovery

Traditional Ceph deployments hardcode monitor IP addresses in `ceph.conf`. In dynamic environments - cloud instances with changing IPs, auto-scaling groups, or Kubernetes deployments - hardcoded IPs become operational burdens. Ceph supports DNS-based monitor discovery using DNS SRV records, enabling clients and daemons to locate monitors dynamically.

## DNS SRV Records for Ceph

Ceph uses DNS SRV records of the form `_ceph-mon._tcp.<cluster-name>.<domain>` to advertise monitor addresses. When `mon_host` is not set in `ceph.conf`, Ceph queries DNS for these records.

## Creating DNS SRV Records

Create SRV records in your DNS server (example using BIND zone file):

```text
; SRV format: _service._protocol.name TTL class SRV priority weight port target
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon1.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon2.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon3.example.com.
```

For msgr2 support, also add port 3300:

```text
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 3300 mon1.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 3300 mon2.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 3300 mon3.example.com.
```

## Configuring ceph.conf for DNS Discovery

Remove hardcoded monitor IPs and set the service name for DNS discovery. Ceph constructs the full SRV query by prepending `_` and appending `._tcp.<search-domain>` to the value of `mon_dns_srv_name`, using the system DNS search domain from `/etc/resolv.conf`:

```ini
[global]
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890
; Do not set mon_host - Ceph will query DNS
mon_dns_srv_name = ceph-mon
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
```

## Testing DNS Monitor Discovery

```bash
# Query DNS SRV records manually
dig SRV _ceph-mon._tcp.ceph.example.com

# Test Ceph connectivity using DNS discovery
ceph --conf /etc/ceph/ceph.conf status
```

Expected `dig` output:

```text
;; ANSWER SECTION:
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon1.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon2.example.com.
_ceph-mon._tcp.ceph.example.com. 300 IN SRV 0 100 6789 mon3.example.com.
```

## Using DNS in Kubernetes with Rook

In Rook deployments, the Ceph monitors have stable Kubernetes Service DNS names. The Rook CSI driver and clients automatically use these names. If you run external Ceph clients that need to connect to a Rook cluster, configure them with the Kubernetes service DNS names:

```bash
# Get the monitor service endpoints
kubectl get services -n rook-ceph | grep mon

# Service DNS names follow: rook-ceph-mon-a.rook-ceph.svc.cluster.local
```

```ini
[global]
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890
mon_host = rook-ceph-mon-a.rook-ceph.svc.cluster.local:6789,\
           rook-ceph-mon-b.rook-ceph.svc.cluster.local:6789,\
           rook-ceph-mon-c.rook-ceph.svc.cluster.local:6789
```

## CoreDNS Configuration for In-Cluster DNS

For Kubernetes-internal Ceph clusters needing SRV records, configure CoreDNS:

```yaml
# CoreDNS custom config using the template plugin
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  ceph.server: |
    ceph.cluster.local:53 {
      template IN SRV ceph.cluster.local {
        match "^_ceph-mon[.]_tcp[.]ceph[.]cluster[.]local[.]$"
        answer "{{ .Name }} 300 IN SRV 0 100 6789 rook-ceph-mon-a.rook-ceph.svc.cluster.local."
        answer "{{ .Name }} 300 IN SRV 0 100 6789 rook-ceph-mon-b.rook-ceph.svc.cluster.local."
        answer "{{ .Name }} 300 IN SRV 0 100 6789 rook-ceph-mon-c.rook-ceph.svc.cluster.local."
      }
    }
```

## Summary

DNS-based Ceph monitor discovery eliminates hardcoded IP addresses in `ceph.conf` by using DNS SRV records under the `_ceph-mon._tcp` naming convention. This is particularly valuable in dynamic cloud environments where monitor IPs change, auto-scaling scenarios, and multi-datacenter deployments where a single DNS name resolves to site-local monitors. For Kubernetes and Rook deployments, Kubernetes Service DNS names provide stable monitor addresses without requiring external DNS SRV record management.
