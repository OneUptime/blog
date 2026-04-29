# Validation Summary: How to Optimize Longhorn Performance for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- `fio`
- Linux storage and TCP networking

## Sources Consulted
- Longhorn Best Practices: https://longhorn.io/docs/1.11.1/best-practices/
- Longhorn Settings Reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn StorageClass Parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn Customizing Default Settings: https://longhorn.io/docs/1.11.1/advanced-resources/deploy/customizing-default-settings/
- Longhorn Revision Counter: https://longhorn.io/docs/1.11.0/advanced-resources/deploy/revision_counter/
- Longhorn Data Locality: https://longhorn.io/docs/1.10.1/high-availability/data-locality/
- Longhorn Multiple Disk Support: https://longhorn.io/docs/1.9.0/nodes-and-volumes/nodes/multidisk/
- Kubernetes `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl wait`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run`: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found
- The fio baseline commands did not wait for the test pod to become Ready, and the fio jobs omitted `direct=1` and `time_based`. I added `kubectl wait`, `--direct=1`, and `--time_based` so the examples better measure storage performance and reliably run for the intended duration.
- The data locality section said `best-effort` ensures a local replica. Longhorn documents `best-effort` as trying to keep a local replica when possible, so I corrected the wording.
- The global data locality patch command used `setting` and implied a general default. Longhorn recommends using `settings.longhorn.io`, and the global default applies to Longhorn UI-created volumes, so I corrected the resource type and clarified the scope.
- The dedicated-disk UI instruction used the wrong menu wording. I changed it to `Edit Disks` to match Longhorn documentation.
- The instance manager CPU section used invalid units and values (`250`/`500` as if the setting were millicores). For the V1 data engine, `guaranteed-instance-manager-cpu` is a percentage-based setting with a default of 12 and a documented range up to 40, so I changed the examples to valid percentage values and clarified that V2 uses a separate setting.
- The replica auto-balance example used `best-effort` as the production recommendation. Longhorn best practices recommend `least-effort` for production, so I updated the example and summary table.
- The revision counter section said it writes metadata on every I/O, implied the default was enabled, and overstated the failure-mode behavior. I corrected it to every write, noted that current Longhorn releases disable it by default, and clarified that auto-salvage falls back to replica head-file metadata when revision counters are disabled.
- The best-practices note for `strict-local` was inaccurate. Longhorn requires `numberOfReplicas: "1"` for `strict-local`, otherwise volume creation fails, so I replaced the incorrect guidance.

## Review Notes
- Review performed against Longhorn 1.11.1 documentation current on April 29, 2026.
- The network sysctl values are valid Linux tuning knobs, but Longhorn’s own production guidance emphasizes dedicated storage networking first. The post’s network section is technically plausible, but results remain environment-specific.
