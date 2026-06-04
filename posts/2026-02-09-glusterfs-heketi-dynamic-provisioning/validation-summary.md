# Validation Summary: How to Deploy GlusterFS with Heketi for Dynamic Volume Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolumeClaim, Pod, Deployment, Secret, ConfigMap, and Service resources
- GlusterFS
- Heketi
- Ubuntu package installation
- SSH key-based node management

## Sources Consulted
- Kubernetes documentation - Volumes, GlusterFS deprecation/removal: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes documentation - StorageClass objects and provisioners: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes v1.25 GlusterFS provisioner source for supported StorageClass parameters and expansion behavior: https://github.com/kubernetes/kubernetes/blob/v1.25.16/pkg/volume/glusterfs/glusterfs.go
- Heketi project documentation - RESTful GlusterFS management and workflow: https://heketi.github.io/heketi/
- Heketi configuration example: https://github.com/heketi/heketi/blob/master/etc/heketi.json
- Heketi admin requirements and topology workflow: https://github.com/heketi/heketi/blob/master/docs/admin/readme.md
- Heketi topology CLI implementation: https://github.com/heketi/heketi/blob/master/client/cli/go/cmds/topology.go
- GlusterFS 10 Ubuntu PPA: https://launchpad.net/~gluster/+archive/ubuntu/glusterfs-10

## Issues Found
- The post presented the setup as current and production-ready Kubernetes guidance. Kubernetes deprecated the in-tree GlusterFS plugin in v1.25 and removed it in v1.26. I added a legacy-cluster caveat and removed the production-ready framing.
- The architecture section said Heketi translates "CSI or provisioner API calls." This Heketi flow uses the legacy in-tree GlusterFS provisioner, not CSI. I changed the wording to legacy GlusterFS provisioner API calls.
- The topology example was described as a ConfigMap and marked as YAML, but the file shown is JSON loaded by `heketi-cli topology load --json`. I corrected the surrounding text and changed the code fence to JSON.
- The SSH private key was mounted from a Kubernetes Secret without an explicit restrictive mode. Heketi SSH execution expects a private key file suitable for SSH use, and overly permissive key files can be rejected by SSH. I added `defaultMode: 0600` to the Secret volume.
- The StorageClass enabled Heketi authentication in `heketi.json` but omitted the explicit `restauthenabled: "true"` parameter shown by Kubernetes-era GlusterFS StorageClass docs. I added it so the StorageClass matches the authenticated Heketi configuration.
- The StorageClass included `snapshot: "enabled"`, which is not parsed by the Kubernetes v1.25 GlusterFS provisioner. The provisioner does parse `snapfactor`; I removed the ignored `snapshot` parameter and clarified the comment.
- The initial GlusterFS description overclaimed "strong consistency guarantees." I softened it to shared file storage across nodes to avoid implying stronger semantics than the post establishes.

## Review Notes
- The corrected tutorial is valid only for legacy Kubernetes clusters that still include the in-tree GlusterFS plugin, such as Kubernetes v1.25 and earlier. It should not be used as a new deployment pattern on Kubernetes v1.26 or later.
- The Heketi Deployment still uses `emptyDir` for `/var/lib/heketi`, which is acceptable for a minimal example but not durable across pod rescheduling. A production deployment should place the Heketi database on persistent storage.
