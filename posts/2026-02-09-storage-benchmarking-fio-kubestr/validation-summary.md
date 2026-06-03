# Validation Summary: How to Implement Storage Benchmarking with fio and kubestr on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- PersistentVolumeClaims and Pods
- CSI VolumeSnapshots
- fio
- kubestr
- GitHub Actions

## Sources Consulted
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- kubestr official website and usage guide: https://kubestr.io/
- kubestr v0.4.41 GitHub release metadata: https://github.com/kastenhq/kubestr/releases/tag/v0.4.41
- kubestr v0.4.41 README: https://github.com/kastenhq/kubestr/blob/v0.4.41/README.md
- kubestr v0.4.41 CLI help from the released Linux amd64 binary
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI VolumeSnapshot API documentation: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- GitHub Actions environment variable documentation: https://docs.github.com/actions/learn-github-actions/environment-variables
- GitHub Actions upload-artifact repository and deprecation notice: https://github.com/actions/upload-artifact
- GitHub Actions checkout repository: https://github.com/actions/checkout

## Issues Found
- The fio examples used `--runtime=60` without `--time_based`. fio can finish after processing the requested file size unless `time_based` is set, so the examples might not actually run for 60 seconds on fast storage. Added `--time_based` to the fio benchmark commands.
- The kubestr v0.4.41 download URL used an asset name that does not exist. Updated it to the actual `kubestr_0.4.41_Linux_amd64.tar.gz` release asset and kept the tar extraction flow.
- The kubestr installation verification used `kubestr version`, but the v0.4.41 binary has no `version` subcommand. Replaced it with `kubestr --help`.
- The kubestr benchmark section used `--quick`, which is not present in kubestr v0.4.41 `fio --help`. Replaced it with a valid predefined test example using `-t default-fio`.
- The snapshot section used `kubestr snapshot`, but v0.4.41 exposes snapshot validation as `kubestr csicheck` and requires a VolumeSnapshotClass with `-v`. Updated the command accordingly.
- The snapshot wait command used `condition=ready`, but VolumeSnapshot readiness is exposed as `.status.readyToUse`. Updated it to `kubectl wait --for=jsonpath='{.status.readyToUse}'=true`.
- The restore timing example measured only `kubectl apply`, not restore readiness. Added a wait for the restored PVC to become `Bound`.
- The benchmark Job referenced `benchmark-pvc` without defining it. Added a matching PVC manifest before the Job.
- The benchmark Job used `echo "\n..."`, which is not portable across shells. Replaced those lines with `printf`.
- The GitHub Actions workflow exported `KUBECONFIG` in one step, which would not persist to later steps. Updated it to write `KUBECONFIG` to `$GITHUB_ENV`.
- The GitHub Actions workflow downloaded a nonexistent kubestr binary URL. Updated it to download and extract the v0.4.41 Linux amd64 tarball.
- The GitHub Actions workflow used `actions/upload-artifact@v3`, which is deprecated and no longer usable on GitHub.com. Updated it to `actions/upload-artifact@v4`; also updated checkout to `actions/checkout@v4`.
- The troubleshooting command `kubectl exec pod -- which fio` used `pod` as if it were a generic resource placeholder. Updated it to target the tutorial pod, `fio-tester`.
- The kubestr cleanup sentence said kubestr runs "multiple fio tests"; kubestr documents running an FIO test for the selected configuration. Tightened the wording to "the fio test."

## Review Notes
- Local `kubectl` and `fio` binaries were not installed in this environment, so Kubernetes and fio command validation was performed against official documentation and, for kubestr, the released v0.4.41 binary help output.
- The snapshot restore example still assumes that `restore-from-snapshot.yaml` creates a PVC named `restored-pvc`; the post does not include that manifest.
