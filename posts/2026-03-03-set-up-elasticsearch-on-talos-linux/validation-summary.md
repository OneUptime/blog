# Validation Summary: How to Set Up Elasticsearch on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux machine configuration
- Elasticsearch 8.12
- Kubernetes StatefulSets, Services, ConfigMaps, and PersistentVolumeClaims
- Elastic Cloud on Kubernetes (ECK)
- Elasticsearch Index Lifecycle Management
- Elasticsearch snapshot repositories

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux CLI reference for `talosctl patch machineconfig` and `talosctl apply-config`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Elasticsearch bootstrap checks: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/bootstrap-checks
- Elasticsearch virtual memory guidance: https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- ECK virtual memory guidance: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/virtual-memory
- Elasticsearch security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- ECK managed Elasticsearch settings: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/settings-managed-by-eck
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The Talos patch example included `machine.disks`, which is no longer present in the current Talos v1.12 MachineConfig reference and was unnecessary because the article uses Kubernetes PVCs through a CSI storage driver. Removed the disk mount from the patch.
- The Talos command used `talosctl apply-config --file` with a partial patch. Replaced it with `talosctl patch machineconfig --patch @talos-es-patch.yaml`, which matches the Talos CLI patch workflow.
- The manual Elasticsearch StatefulSet enabled security while explicitly disabling transport TLS. Elasticsearch bootstrap checks require internode TLS when security is enabled for a secured multi-node cluster. Changed the hand-written StatefulSet path to disable Elasticsearch security and added a note directing production security to ECK.
- Removed the now-unused Elasticsearch password Secret, `ELASTIC_PASSWORD` environment variable, probe Authorization headers, and `curl -u` examples from the manual deployment path.
- The service comment called a `ClusterIP` Service "External access". Updated it to "Internal client access service" to match the actual Kubernetes Service type.
- The deployment order created the StatefulSet before the headless Service. Reordered the commands to create the Service before the StatefulSet so the StatefulSet has the governing headless Service available for stable network identities.
- The ECK example set `node.store.allow_mmap: true`. ECK guidance recommends increasing `vm.max_map_count` and leaving `node.store.allow_mmap` unset for production workloads, so the explicit setting was removed.

## Review Notes
- The manual StatefulSet example is now technically consistent but intentionally not a production-secured Elasticsearch deployment. For production, ECK is the better fit because it manages TLS certificates, users, discovery settings, and other Elasticsearch settings that are easy to misconfigure by hand.
- Elasticsearch documentation now recommends `vm.max_map_count=1048576`, while Elasticsearch 8.12 still requires at least `262144`. The post's value remains valid for the Elasticsearch version shown.
- The S3 snapshot repository example assumes the Elasticsearch S3 repository client can authenticate in the target environment, such as through configured keystore settings or cloud workload identity.
