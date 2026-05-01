# Validation Summary: How to Register Elemental Machines with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SUSE Rancher Prime: OS Manager (Elemental)
- Rancher
- Kubernetes custom resources (`MachineRegistration`, `MachineInventory`, `SeedImage`)
- `kubectl`
- TLS and CA certificate validation

## Sources Consulted
- MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- Installation: https://documentation.suse.com/cloudnative/os-manager/latest/en/installation/installation.html
- Certificate Authority Verification: https://documentation.suse.com/cloudnative/os-manager/latest/en/operator-operational-tasks/certificate-authority.html
- Troubleshooting and verification steps: https://documentation.suse.com/cloudnative/os-manager/latest/en/troubleshooting/troubleshooting-verification.html
- SeedImage reference: https://documentation.suse.com/cloudnative/os-manager/1.7/en/references/seedimage-reference.html
- MachineInventory reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/machineinventory-reference.html
- SUSE Rancher Prime OS Manager the visual way: https://documentation.suse.com/external-tree/en-us/cloudnative/os-manager/1.6/en/quickstart-ui.html
- Adding TLS Secrets: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/resources/tls-secrets.html

## Issues Found
- The original ISO build section used a manual `elemental-cli build-iso` flow with a registration YAML passed as build config. Current OS Manager documentation describes registration media creation through the `SeedImage` CRD, so I replaced the snippet with a documented `SeedImage` example and retrieval of `.status.downloadURL`.
- The original CA extraction used the `tls-rancher-internal-ca` secret, which is not the general Rancher CA source documented for agents. I changed the instructions to wait for the `MachineRegistration` to be `Ready`, extract `status.registrationURL`, and, when using a private CA, download the CA bundle from Rancher’s `/cacerts` endpoint.
- The original verification command checked `.spec.machineRef.name` on `MachineInventory`, which is not the documented signal for registration or adoption. I replaced it with a condition-based check and clarified that `Ready=True` confirms registration, while `AdoptionReady=True` only appears after selector or cluster adoption.
- The original troubleshooting command targeted the `elemental-system` namespace. The documented operator deployment is in `cattle-elemental-system`, so I corrected the log command to read from `deploy/elemental-operator` in that namespace.
- The original Rancher UI path was outdated. I updated it from `Cluster Management > Advanced > Machines` to `OS Management > Inventory of Machines`, which matches the documented Elemental UI flow.
- The original workflow wording implied the machine only appears in `MachineInventory` after reboot. I adjusted the sequence so it reflects the documented onboarding flow where registration creates the `MachineInventory`, then installation and reboot complete before cluster adoption.

## Review Notes
- The post now uses a documented `baseImage` example tag for the `SeedImage`. Readers should align that image tag with the OS Manager or Elemental version they actually run.
- `rancher-ca.pem` is only needed when Rancher uses a private CA. If Rancher uses a publicly trusted certificate and the environment relies on the system trust store, that file is not required.
- No other technical issues were found after the above corrections.
