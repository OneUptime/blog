# Validation Summary: How to Provision Talos Linux on GCP with Terraform

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Google Cloud Platform (Compute Engine, VPC, Cloud Load Balancing, GCS)
- Terraform (HCL, hashicorp/google provider)
- Kubernetes
- talosctl CLI
- gcloud CLI / gsutil

## Sources Consulted
- Talos v1.7.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Sidero Labs docs — GCP platform install (v1.7): https://www.talos.dev/v1.7/talos-guides/install/cloud-platforms/gcp/
- Sidero Labs docs — talosctl CLI reference (v1.7): https://www.talos.dev/v1.7/reference/cli/
- Sidero Labs docs — Ingress firewall / network ports (v1.7): https://www.talos.dev/v1.7/learn-more/talos-network-connectivity/
- Terraform Google provider — `google_compute_region_backend_service`, `google_compute_forwarding_rule`, `google_compute_health_check`, `google_compute_instance`, `google_compute_firewall`, `google_compute_network`, `google_compute_subnetwork`, `google_compute_instance_group` resource docs (registry.terraform.io/providers/hashicorp/google)
- GCP docs — Custom image creation and guest OS features: https://cloud.google.com/compute/docs/images/create-custom
- GCP docs — Regional external passthrough Network Load Balancer (backend-service based): https://cloud.google.com/load-balancing/docs/network/networklb-backend-service
- GCP docs — E2 machine family and persistent disk types

## Issues Found
- **Incorrect Talos GCP release asset filename.** The post referenced `gcp-amd64.tar.gz`, but the actual asset published on the Talos v1.7.0 GitHub release is `gcp-amd64.raw.tar.gz`. The original `wget` URL would 404. Fixed all three occurrences in the Importing the Talos Image section: the `wget` URL, the `gsutil cp` source filename, and the `--source-uri` value passed to `gcloud compute images create`.

## Review Notes
- Opening Talos `apid` (TCP 50000) to `0.0.0.0/0` in the external firewall rule works but is not best practice; Sidero recommends restricting the source range to a management CIDR. The post itself touches on tighter access control under "Production Tips" via VPC Service Controls, which is acceptable framing — left as-is.
- `load_balancing_scheme = "EXTERNAL"` on the backend service and forwarding rule is the correct value for a regional external passthrough Network Load Balancer (the backend-service-based replacement for the legacy target-pool design). The newer `EXTERNAL_MANAGED` scheme is for Envoy-based proxy LBs and would be wrong here.
- The `--guest-os-features=VIRTIO_SCSI_MULTIQUEUE` flag matches Sidero's documented recommendation for Talos GCP images. Notably, Sidero advises *against* enabling `GVNIC` for Talos at this time (known compatibility issue), so the minimal feature set here is correct.
- The `talosctl kubeconfig --nodes <FIRST_CP_IP>` invocation omits the optional `[local-path]` positional argument — that is fine; it defaults to merging into `~/.kube/config`.
- The post uses Talos v1.7.0, which was current at the time of writing. Readers using newer Talos versions should swap the version string and re-confirm the release asset name.
