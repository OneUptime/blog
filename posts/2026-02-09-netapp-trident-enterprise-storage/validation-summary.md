# Validation Summary: How to Deploy NetApp Trident for Enterprise Storage Integration on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NetApp Trident / Astra Trident
- Container Storage Interface (CSI)
- ONTAP NAS and SAN
- Kubernetes StorageClass, PersistentVolumeClaim, and VolumeSnapshot APIs
- Prometheus ServiceMonitor and PromQL

## Sources Consulted
- NetApp Trident 26.02 operator deployment documentation: https://docs.netapp.com/us-en/trident/trident-install/kubernetes-deploy-operator.html
- NetApp Trident 26.02 operator customization documentation: https://docs.netapp.com/us-en/trident/trident-install/kubernetes-customize-deploy.html
- NetApp Trident 26.02 release artifact: https://github.com/NetApp/trident/releases/download/v26.02.0/trident-installer-26.02.0.tar.gz
- NetApp Trident requirements and supported backends: https://docs.netapp.com/us-en/trident/trident-get-started/requirements.html
- NetApp Trident ONTAP NAS backend configuration options: https://docs.netapp.com/us-en/trident/trident-use/ontap-nas-examples.html
- NetApp Trident ONTAP SAN driver overview: https://docs.netapp.com/us-en/trident/trident-use/ontap-san.html
- NetApp Trident ONTAP SAN backend configuration options: https://docs.netapp.com/us-en/trident/trident-use/ontap-san-examples.html
- NetApp Trident StorageClass parameters: https://docs.netapp.com/us-en/trident/trident-use/trident-fsx-storageclass-pvc.html
- NetApp Trident volume import documentation: https://docs.netapp.com/us-en/trident/trident-use/vol-import.html
- NetApp Trident snapshot documentation: https://docs.netapp.com/us-en/trident/trident-use/vol-snapshots.html
- NetApp Trident monitoring documentation: https://docs.netapp.com/us-en/trident/trident-use/monitor-trident.html

## Issues Found
- The introduction claimed Trident supports object storage and listed E-Series as a supported backend. Official NetApp documentation describes Trident as provisioning block and file volumes and lists current supported backends such as ONTAP, Element, Azure NetApp Files, Google Cloud NetApp Volumes, Cloud Volumes ONTAP, and FSx for ONTAP. Updated the backend and protocol wording.
- The architecture section used `NVME-oF`; NetApp's Trident ONTAP SAN documentation specifically describes NVMe/TCP support and also includes FC for ONTAP SAN. Updated the protocol list.
- The post pinned Trident 23.10 installer and images, which are outdated for a 2026 guide. Updated the install example to Trident 26.02.0 and corresponding AutoSupport image.
- The operator install commands used direct namespace creation and `kubectl apply` for CRDs/bundle. NetApp's operator guide uses `deploy/namespace.yaml` and `kubectl create`; the 26.02 release artifact provides `deploy/bundle.yaml`. Updated the commands to match the official flow and current release artifact.
- The operator readiness check used a label selector that does not match the Trident operator bundle. Verified the 26.02 bundle labels and updated the selector to `app=operator.trident.netapp.io,name=trident-operator`.
- The `TridentOrchestrator` verification commands used `-n trident`, but the 26.02 CRD is cluster-scoped. Removed the namespace flags.
- The `TridentOrchestrator` example used `image` and `enableNodePrep`; the Trident customization documentation uses `tridentImage` and `nodePrep`, not `enableNodePrep`. Replaced `image` and removed `enableNodePrep`.
- The ONTAP SAN backend specified an iSCSI `dataLIF` and placed `igroupName` under `defaults`. NetApp's configuration documentation warns not to specify `dataLIF` for iSCSI and documents `igroupName` as a top-level ONTAP SAN option. Updated the backend example.
- The ONTAP SAN StorageClass used the `IOPS` selector parameter, which NetApp documents as a SolidFire-supported StorageClass attribute. Removed it from the ONTAP SAN StorageClass.
- The import example used a `TridentVolumeReference` custom resource, which is not the documented Trident volume import API. Replaced it with the supported PVC annotation flow using `trident.netapp.io/importOriginalName` and `trident.netapp.io/importBackendUUID`.
- The QoS StorageClass attempted to set ONTAP `qosPolicy`, `adaptiveQosPolicy`, and `IOPS` as StorageClass parameters. NetApp documents ONTAP QoS policy groups as backend or storage pool options, with StorageClasses selecting matching pools by labels/selectors. Updated the example accordingly.
- The PromQL examples referenced `trident_backend_state` and histogram buckets that are not in NetApp's published monitoring examples. Replaced them with NetApp's documented REST success rate and average operation duration queries.

## Review Notes
The NetApp 26.02 operator documentation still describes `bundle_pre_1_25.yaml` and `bundle_post_1_25.yaml`, but the official 26.02.0 release artifact contains `deploy/bundle.yaml`. The post uses the artifact's actual file name so the command matches the downloaded installer.
