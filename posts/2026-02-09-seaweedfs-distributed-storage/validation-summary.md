# Validation Summary: How to Deploy SeaweedFS for Distributed Object and File Storage on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- SeaweedFS 3.60
- SeaweedFS master, volume, filer, S3 gateway, and FUSE mount commands
- Kubernetes Services, StatefulSets, Deployments, Secrets, ConfigMaps, PersistentVolumeClaims, and hostPath volumes
- AWS CLI against an S3-compatible endpoint
- Prometheus Operator ServiceMonitor resources

## Sources Consulted
- SeaweedFS official GitHub README: https://github.com/seaweedfs/seaweedfs
- SeaweedFS 3.60 Docker image command help for `weed master`, `weed volume`, `weed filer`, `weed s3`, and `weed mount`
- SeaweedFS replication wiki: https://github-wiki-see.page/m/seaweedfs/seaweedfs/wiki/Replication
- SeaweedFS weed shell wiki: https://github-wiki-see.page/m/seaweedfs/seaweedfs/wiki/weed-shell
- SeaweedFS S3 command source/help: https://github.com/seaweedfs/seaweedfs/blob/master/weed/command/s3.go
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Prometheus Operator API reference for ServiceMonitor endpoints: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Shell variable expansion in SeaweedFS container commands used `$(POD_IP)` and `$(RACK)`, which performs shell command substitution instead of reading environment variables. Changed these to `${POD_IP}` and `${RACK}`.
- The monitoring section used ServiceMonitors that selected a `metrics` Service port, but the master, volume, and filer Services did not expose metrics ports. Added matching `metrics` Service and container ports, and added `-metricsPort=9324` to the master.
- The filer example ran two replicas with local `leveldb2` metadata and no mounted `/data` volume. Changed the local metadata example to one replica and added a PersistentVolumeClaim mounted at `/data`.
- The filer deployment commands only applied the Service file and skipped the ConfigMap, PVC, and Deployment. Added the missing `kubectl apply` commands.
- The filer test command reconstructed a pod name incorrectly from JSONPath output. Replaced it with a direct `FILER_POD` lookup.
- The S3 deployment commands applied the Secret and Service but skipped the Deployment. Added the missing `kubectl apply -f seaweedfs-s3-deployment.yaml`.
- The S3 identity actions omitted `List` and `Tagging`, which are included in SeaweedFS's documented full-access S3 example and are needed for common list/tag operations. Added them to the admin identity.
- The LoadBalancer endpoint lookup only handled IP-based load balancers. Updated it to read either `.ip` or `.hostname`.
- The FUSE-to-S3 verification wrote `/testfile.txt` at the filer root but checked an invalid S3 URI. Updated the example to write under `/buckets/test-bucket/testfile.txt` and verify `s3://test-bucket/testfile.txt`.
- The replication command was described as setting the default replication, but `volume.configure.replication` changes an existing volume and should be followed by `volume.fix.replication`. Updated the example and wording.
- The listed metric names used non-matching lowercase names. Replaced them with metric names observed from SeaweedFS 3.60 metrics output and documented command behavior.

## Review Notes
The guide now validates as a practical manifest-based tutorial. For future production hardening, the filer should use an external metadata backend such as PostgreSQL, MySQL, Redis, or another supported shared store before increasing filer replicas above one.
