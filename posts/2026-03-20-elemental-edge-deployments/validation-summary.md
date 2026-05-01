# Validation Summary: How to Configure Elemental for Edge Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager (Elemental)
- Rancher
- Kubernetes
- K3s
- systemd
- Podman
- `kubectl`
- `jq`

## Sources Consulted
- SUSE Rancher Prime: OS Manager MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- SUSE Rancher Prime: OS Manager Cloud-config reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/cloud-config-reference.html
- SUSE Rancher Prime: OS Manager MachineInventory reference: https://documentation.suse.com/cloudnative/os-manager/1.9/en/references/machineinventory-reference.html
- SUSE Rancher Prime: OS Manager Inventory Management reference: https://documentation.suse.com/cloudnative/os-manager/1.7/en/references/inventory-management.html
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- K3s embedded registry mirror and default endpoint fallback: https://documentation.suse.com/cloudnative/k3s/latest/en/installation/registry-mirror.html
- systemd manager configuration (`RuntimeWatchdogSec=` / `RebootWatchdogSec=`): https://www.freedesktop.org/software/systemd/man/256/systemd-system.conf.html
- systemd TPM enrollment semantics: https://www.freedesktop.org/software/systemd/man/254/systemd-cryptenroll.html
- SLE Micro deployment images and disk-encryption image guidance: https://documentation.suse.com/en-us/sle-micro/6.0/html/Micro-deployment-images/index.html
- Rancher system-agent configuration example: https://github.com/rancher/system-agent/blob/main/examples/configuration/README.md
- Elemental operator `MachineRegistration` CRD source: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineregistration_types.go
- Elemental operator config types (`system-agent` fields): https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/types.go
- Elemental operator install testdata showing generated elemental-system-agent paths: https://github.com/rancher/elemental-operator/blob/main/pkg/install/_testdata/before-hook-config-install.yaml

## Issues Found
- The post used `spec.machineLabels`, but the supported field is `spec.machineInventoryLabels`. I corrected the YAML to use the documented CRD field.
- The low-bandwidth example wrote unsupported keys (`connectionTimeout`, `pingInterval`) to an agent config and used an unsupported `config.elemental.system-agent.applyInterval` field. I removed those invalid settings and added a short note explaining that these interval knobs are not documented `MachineRegistration` fields.
- The industrial watchdog example wrote settings to the wrong path and used `ShutdownWatchdogSec`, which is not the documented manager option for this use case. I changed the example to a `system.conf.d` drop-in using `[Manager]`, `RuntimeWatchdogSec=`, and `RebootWatchdogSec=`.
- The serial and physical-console examples enabled root autologin while describing security hardening or generic headless access. I replaced those overrides with non-autologin `agetty` configurations and changed the `runcmd` steps to reload/restart the affected services.
- The physical security section used interactive commands (`grub2-setpassword`) and described `systemd-cryptenroll` as if it enabled disk encryption by itself. I removed those commands because they were misleading for unattended cloud-config and do not match the documented TPM enrollment and encrypted-image workflow.
- The offline K3s example did not disable fallback to upstream registries, so it would still try internet endpoints by default. I added `/etc/rancher/k3s/config.yaml` with `disable-default-registry-endpoint: true` and clarified that the local registry must already be pre-seeded.
- The monitoring commands treated `MachineInventory` as if it had a `Connected` condition and a `last contact` field in `.status.conditions`. I replaced them with commands that inspect the documented `Ready` condition and plan state instead.
- The design-principles text overstated two behaviors. I changed “Declarative configuration” to “Declarative provisioning” and replaced the “Secure boot” bullet with TPM attestation wording that matches the documented Elemental authentication model.

## Review Notes
- The offline registry example is K3s-specific because it uses `/etc/rancher/k3s/`. Equivalent RKE2 deployments would use `/etc/rancher/rke2/` paths instead.
- Elemental re-registration updates labels and annotations on a periodic basis, but `MachineRegistration.spec.config` changes are ignored after a machine has already completed installation.
