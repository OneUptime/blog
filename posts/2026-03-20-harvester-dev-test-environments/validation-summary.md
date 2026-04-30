# Validation Summary: How to Set Up Harvester for Dev/Test Environments - Environments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- CDI DataVolumes
- Kubernetes RBAC
- Kubernetes CronJob
- cloud-init
- Bash
- kubectl

## Sources Consulted
- Harvester API: Create a Namespaced Virtual Machine Template — https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template/
- Harvester API: Create a Namespaced Virtual Machine Template Version — https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template-version/
- Harvester: Create a Volume — https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester: Access to the Virtual Machine — https://docs.harvesterhci.io/v1.7/vm/access-to-the-vm
- Harvester: VM Network — https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- KubeVirt: Resources requests and limits — https://kubevirt.io/user-guide/compute/resources_requests_and_limits/
- KubeVirt: Accessing Virtual Machines — https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt: Filesystems, Disks and Volumes — https://kubevirt.io/user-guide/storage/disks_and_volumes/
- KubeVirt API reference: operations — https://kubevirt.io/api-reference/main/operations.html
- Kubernetes: Resource Quotas — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: CronJob — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes: kubectl create namespace — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace
- Kubernetes: kubectl wait — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Kubernetes: Install and Set Up kubectl on Linux — https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Helm: Installing Helm — https://helm.sh/docs/intro/install/
- Docker Docs: Ubuntu — https://docs.docker.com/installation/ubuntulinux/
- k9s README — https://github.com/derailed/k9s

## Issues Found
- The Harvester template manifest used incorrect API field names (`defaultVersionID`, `templateID`) and an invalid unnamed root `dataVolume`. I corrected the field names to `defaultVersionId` and `templateId`, added the required VM metadata block, and replaced the blank root-disk reference with a named DataVolume backed by an imported Harvester image.
- The developer automation script referenced a PVC that it never created, which would prevent the VM from starting. I changed it to use `dataVolumeTemplates`, added explicit image and storage-class variables, and removed the orphan PVC deletion path.
- The original SSH key fallback could emit invalid cloud-init YAML when no public key existed locally. I changed the script to require a real public key file before creating the VM.
- The original `kubectl wait vmi/... --for=condition=Ready` could fail before the `VirtualMachineInstance` existed. I added an initial `kubectl wait --for=create` step before waiting for `Ready`.
- The RBAC example mixed console/VNC and start/stop subresources under the same verbs and granted broader VMI mutation than the post actually described. I split VM CRUD, VMI visibility, start/stop/restart access, and console/VNC access into separate rules and added read access for DataVolumes and template objects used elsewhere in the tutorial.
- The cleanup CronJob referenced a `cleanup-sa` service account that was never created, lacked RBAC permissions to delete VMs, and depended on `jq` being present in the `kubectl` image. I added the missing ServiceAccount/Role/RoleBinding and replaced the `jq` pipeline with a `jsonpath` + shell comparison flow.
- The quota comment described `requests.cpu` as a VM vCPU cap, which is not what Kubernetes `ResourceQuota` measures. I updated the comments to describe aggregate CPU requests and limits accurately.

## Review Notes
- The corrected template and script assume an imported Harvester VM image named `ubuntu-2204` in `harvester-public`. The `imageId` and image-backed `storageClassName` should be adjusted to match the actual image object in the target cluster.
- The VM examples still use the Harvester management network path (`pod`/`masquerade`). Harvester documents that management-network IP reachability depends on cluster/network design, so direct SSH from a workstation may require a cluster-reachable network or a dedicated VM network/service.
- The CronJob example now uses `.spec.timeZone`, which is stable in Kubernetes v1.27 and later. Current supported Harvester releases are new enough for this field, but older clusters would need to omit it.
