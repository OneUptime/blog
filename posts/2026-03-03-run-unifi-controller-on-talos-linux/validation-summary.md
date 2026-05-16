# Validation Summary: How to Run Unifi Controller on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (Kubernetes distribution)
- Kubernetes (Deployments, Services, PVCs, ConfigMaps, CronJobs, LoadBalancer with MetalLB)
- Ubiquiti UniFi Network Application / Controller
- linuxserver/unifi-network-application Docker image
- MongoDB 4.4 (backing store)
- DHCP Option 43 (device discovery)
- UniFi `set-inform` device CLI
- Longhorn (storage class example)
- NFS (backup target)

## Sources Consulted
- Ubiquiti Help Center: Required Ports Reference — https://help.ui.com/hc/en-us/articles/218506997-Required-Ports-Reference
- Ubiquiti Help Center: Explaining the UniFi system.properties File — https://help.ui.com/hc/en-us/articles/205202580-Explaining-the-UniFi-system-properties-File
- LinuxServer.io docker-unifi-network-application docs — https://docs.linuxserver.io/images/docker-unifi-network-application/
- UniFi set-inform community references (lazyadmin.nl, unihosted.com)
- Kubernetes Deployment / Service / ConfigMap / CronJob API reference (apps/v1, v1, batch/v1)
- MetalLB `metallb.universe.tf/loadBalancerIPs` annotation docs

## Issues Found

1. **Destructive `is_default=true` in system.properties (serious)** — The ConfigMap set `is_default=true`, which is a documented trigger that causes the UniFi controller to reset to factory defaults on next start. Because the property is mounted from a ConfigMap, every pod restart would wipe the controller's configuration. Removed `is_default=true` from the system.properties ConfigMap, leaving only `system_ip=192.168.1.220` (which is the correct way to override the advertised inform IP).

2. **Missing `MONGO_AUTHSOURCE` env var (broken auth)** — The MongoDB Deployment creates the user via `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD`, which provisions the account in MongoDB's `admin` database. The linuxserver/unifi-network-application image, however, defaults `MONGO_AUTHSOURCE` to the value of `MONGO_DBNAME` (`unifi`), so authentication would fail out of the box. Added `MONGO_AUTHSOURCE: "admin"` to the controller env vars so the image authenticates against the correct database.

3. **Incorrect DHCP Option 43 explanation** — The post claimed Option 43's value should be "the hex-encoded inform URL". UniFi's Option 43 actually uses a TLV sub-option format (`01:04:<IP-in-hex>`), not a URL. Rewrote the paragraph to describe the correct `01:04:XX:XX:XX:XX` format with a worked example for `192.168.1.220` → `01:04:C0:A8:01:DC`.

4. **Missing `##` on the "Resource Monitoring" heading** — The line was plain text rather than a markdown heading, which would render incorrectly and break the table of contents. Restored the `## ` prefix to match the rest of the section headers.

## Review Notes

- **MongoDB 4.4 is EOL** (upstream support ended February 2024). The linuxserver/unifi-network-application image still works with it, and 4.4 remains the safest choice for hosts without AVX, but a future update could move this to `mongo:7.0` for users on modern hardware. Left as-is to preserve the author's intent and broad hardware compatibility.
- The "UniFi Controller" branding was renamed to "UniFi Network Application" some versions ago. The post uses the older term consistently, which is still widely understood; no change made.
- The `linuxserver/unifi-network-application` image expects the MongoDB user to have write access to both the `unifi` and `unifi_stat` databases. Using the MongoDB `root` account (as the post does, now with `MONGO_AUTHSOURCE=admin`) satisfies this implicitly. A more least-privilege setup would create scoped users via a MongoDB init script — worth mentioning in a future revision but outside the scope of a technical-correctness fix.
- The `/status` endpoint on port 8443 used by the probes is a real, undocumented-but-stable endpoint that returns HTTP 200 with controller version JSON; it is widely used as a health check in community deployments and works for the kubelet's default 200–399 success range.
- The `kubectl cp` example uses the placeholder pod name `unifi-controller-xxx`; readers will need to substitute the actual pod name from `kubectl get pods -n unifi`. This is conventional in tutorials and was left as-is.
