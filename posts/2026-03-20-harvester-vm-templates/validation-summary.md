# Validation Summary: How to Create VM Templates in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- `kubectl`
- cloud-init
- Virtual machine templates

## Sources Consulted
- Harvester API: Create a Namespaced Virtual Machine Template: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template/
- Harvester API: Create a Namespaced Virtual Machine Template Version: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-template-version/
- Harvester API: Create a Namespaced Virtual Machine: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine/
- Harvester documentation, Virtual Machines: https://docs.harvesterhci.io/v1.7/vm/virtual-machines
- Harvester documentation, Create a Virtual Machine / Run Strategy details: https://docs.harvesterhci.io/v1.5/vm/index/
- Harvester documentation, Create a Volume: https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester source, template CRD types: https://github.com/harvester/harvester/blob/8488efabe3d819aa11b612dd736c927ea446a02f/pkg/apis/harvesterhci.io/v1beta1/template.go
- Harvester source, built-in template examples: https://github.com/harvester/harvester/blob/8488efabe3d819aa11b612dd736c927ea446a02f/pkg/data/template.go
- Harvester source, template version validation rules: https://github.com/harvester/harvester/blob/8488efabe3d819aa11b612dd736c927ea446a02f/pkg/webhook/resources/templateversion/validator.go
- Harvester source, template/version controller behavior: https://github.com/harvester/harvester/blob/8488efabe3d819aa11b612dd736c927ea446a02f/pkg/controller/master/template/template_controller.go
- Harvester source, VM API schema registration: https://github.com/harvester/harvester/blob/8488efabe3d819aa11b612dd736c927ea446a02f/pkg/api/vm/schema.go
- KubeVirt user guide, Run Strategies: https://kubevirt.io/user-guide/compute/run_strategies/

## Issues Found
- The post used incorrect Harvester CRD field names: `defaultVersionID`, `templateID`, and `vm.objectMeta`. I corrected them to `defaultVersionId`, `templateId`, and `vm.metadata` to match the Harvester API schema.
- The template version examples used the legacy `running` field. I replaced those with `runStrategy` values that match the current KubeVirt API, using `Halted` for templates that should not auto-start and `Always` for the example VM that should boot after creation.
- The template version examples were missing CPU limits. Harvester's template version validator requires both CPU and memory limits, so I added CPU requests/limits alongside the existing memory settings.
- The reusable root disk example used `dataVolume.name: ""`, which is not how Harvester's built-in template versions define placeholder image-backed storage. I replaced it with the supported `harvesterhci.io/volumeClaimTemplates` annotation plus matching `persistentVolumeClaim` volume references.
- The Version 2 example unintentionally dropped fields from Version 1 even though template versions store full VM specs rather than patches. I restored the labels, tablet input, root-disk definition, and cloud-init user configuration so Version 2 reflects an actual updated full template.
- The `Via kubectl` section was incorrect in two ways: it declared the VM as `harvesterhci.io/v1beta1` instead of `kubevirt.io/v1`, and it used a non-existent `harvesterhci.io/vmTemplateVersion` annotation. I rewrote that section to describe the supported CLI workflow: inspect the template version and create a normal KubeVirt `VirtualMachine` manifest from its `spec.vm` data.
- The management section implied any template version could be deleted. Harvester rejects deletion of the default template version, so I clarified that only non-default versions can be deleted directly.
- The conclusion claimed templates can be shared across namespaces. Harvester templates are namespaced resources, and the template version validator enforces same-namespace template/version pairing, so I removed that unsupported claim.

## Review Notes
- Harvester's versioned documentation around VM run strategies is inconsistent: older UI docs describe `Stop` as the `running: false` equivalent, while the current KubeVirt API and Harvester source use `Halted`. The post was updated to the current API spelling.
- Harvester automatically assigns the first template version as the default when `defaultVersionId` is empty, so the first `kubectl patch` example is optional rather than required.
- Harvester's built-in base templates use placeholder `harvesterhci.io/imageId` values in `harvesterhci.io/volumeClaimTemplates`, which is why the UI can prompt for a boot image later when creating a VM from a template.
- The review validated manifests and behavior against official docs and upstream source code, but did not apply the manifests to a live Harvester cluster in this workspace.
