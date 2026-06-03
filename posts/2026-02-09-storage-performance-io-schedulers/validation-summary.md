# Validation Summary: How to Implement Storage Performance Tuning with IO Schedulers and Mount Options

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolumeClaim, DaemonSet, Pod, and kubectl
- AWS EBS CSI driver
- Longhorn StorageClass parameters
- Linux block device queue sysfs settings and IO schedulers
- ext4 mount options
- fio benchmarking
- Prometheus, node_exporter, ServiceMonitor, and PrometheusRule
- systemd and udev

## Sources Consulted
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Amazon EKS StorageClass parameters for the AWS EBS CSI driver: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Longhorn StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Linux kernel IO scheduler switching documentation: https://www.kernel.org/doc/html/latest/block/switching-sched.html
- Linux kernel block queue sysfs documentation: https://www.kernel.org/doc/html/v5.16/block/queue-sysfs.html
- Linux kernel ext4 mount option documentation: https://docs.kernel.org/admin-guide/ext4.html
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- Prometheus PromQL operators and functions: https://prometheus.io/docs/prometheus/latest/querying/operators/ and https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus node_exporter project documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The AWS EBS StorageClass used the removed in-tree `kubernetes.io/aws-ebs` provisioner. Updated it to the current AWS EBS CSI provisioner, `ebs.csi.aws.com`, and set the filesystem type parameter for ext4-specific mount options.
- The DaemonSet wrote `0` to `discard_max_bytes` while describing this as enabling TRIM/discard. Linux documents this sysfs field as the software discard byte limit, so the example now copies `discard_max_hw_bytes` into `discard_max_bytes` when supported.
- The DaemonSet and systemd examples unconditionally wrote scheduler names to `/sys/block/.../queue/scheduler`. Updated them to check whether the scheduler is available before writing, avoiding failures on kernels or devices where a scheduler is not listed.
- The Longhorn StorageClass examples used ext4-specific mount options without explicitly setting `fsType`. Added `fsType: ext4` parameters to keep the examples consistent.
- The `kubectl run` mount-check command passed `mount` as an argument to Bash rather than executing `mount | grep /data`. Updated the command override so the container runs the intended shell pipeline.
- The fio benchmarks used `--runtime` without `--time_based`, which caps runtime but does not guarantee a fixed-duration test if the configured workload completes first. Added `--time_based` to each benchmark.
- The PromQL average wait-time query and alert used `rate()` around an invalid addition of range vectors. Replaced them with valid PromQL that sums read/write time rates and divides by summed read/write operation rates.

## Review Notes
- The examples still intentionally include risky performance options such as `nobarrier`, `data=writeback`, and long commit intervals. These are technically valid ext4 options, but they should be used only when the storage durability tradeoff is understood.
- `kubectl` was not installed in the local workspace, so kubectl examples were verified against official Kubernetes CLI documentation rather than local dry-run output.
