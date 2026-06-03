# Validation Summary: How to Configure Raw Block Volumes in Kubernetes for Database Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes Pods and StatefulSets
- AWS EBS CSI Driver
- PostgreSQL
- MySQL InnoDB
- fio benchmarking
- Linux block devices and filesystems

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#raw-block-volume-support
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- AWS EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI Driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- PostgreSQL initdb documentation: https://www.postgresql.org/docs/15/app-initdb.html
- MySQL 8.0 InnoDB startup configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-init-startup-configuration.html
- ScyllaDB Operator storage documentation: https://operator.docs.scylladb.com/stable/architecture/storage/overview.html

## Issues Found
- The post described raw block volumes as guaranteeing maximum IOPS and lowest latency. I changed the wording to say raw block can reduce overhead when the application supports direct block access, because Kubernetes documents this as bypassing the filesystem layer but the real performance benefit must be workload- and storage-provider-tested.
- The AWS EBS CSI StorageClass used `iops: "50000"`. Although current AWS references include both `iops` and `iopsPerGB`, the surrounding example used a 100Gi volume and the common CSI parameter for this style is `iopsPerGB`, so I changed it to `iopsPerGB: "500"` to request 50,000 IOPS for that PVC size.
- The initial PostgreSQL pod exposed a raw block device but did not configure PostgreSQL to use it. I changed that example to a generic block-device consumer so it accurately demonstrates `volumeDevices`.
- The PostgreSQL formatting demo used Alpine commands that are not present in a base Alpine image. I added installation of `e2fsprogs` and `util-linux`, plus basic shell error handling and mount-directory creation.
- The MySQL section claimed MySQL could directly use the exposed raw block device, but the sample configuration never told InnoDB to use it. I changed the text and config to use `innodb_data_home_dir` and `innodb_data_file_path` for an InnoDB raw system tablespace before first initialization.
- The StatefulSet example used ScyllaDB with a raw block device path, but ScyllaDB's Kubernetes storage guidance uses PVC-backed filesystems such as XFS, not an arbitrary raw block device path in the container. I changed the example to a generic stateful block-device consumer.
- The benchmark command used `kubectl wait --for=condition=complete` against a Pod. Pods do not expose a `Complete` condition; I changed it to wait for `.status.phase` to become `Succeeded` using kubectl's supported JSONPath wait mode.

## Review Notes
The Kubernetes API fields used in the post are current and stable. The examples that format or mount block devices require privileged containers and should be treated as demonstrations rather than production database manifests.
