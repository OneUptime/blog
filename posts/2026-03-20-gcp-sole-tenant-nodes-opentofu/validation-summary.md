# Validation Summary: How to Configure GCP Sole-Tenant Nodes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Compute Engine
- GCP Sole-Tenant Nodes
- OpenTofu / Terraform HCL
- HashiCorp Google provider resources: `google_compute_node_template`, `google_compute_node_group`, `google_compute_instance`
- Windows BYOL licensing on Google Cloud
- VPC networking for Compute Engine instances

## Sources Consulted
- Google Cloud: Sole-tenancy overview: https://cloud.google.com/compute/docs/nodes/sole-tenant-nodes
- Google Cloud: Provision VMs on sole-tenant nodes: https://cloud.google.com/compute/docs/nodes/provisioning-sole-tenant-vms
- Google Cloud: Create sole-tenant node groups: https://cloud.google.com/compute/docs/nodes/sole-tenancy-node-groups
- Google Cloud: Overcommit CPUs on sole-tenant VMs: https://cloud.google.com/compute/docs/nodes/overcommitting-cpus-sole-tenant-vms
- Google Cloud: Operating system details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud: Bringing your own licenses: https://cloud.google.com/compute/docs/nodes/bringing-your-own-licenses
- Google Cloud: Create custom Windows BYOL images: https://cloud.google.com/compute/docs/images/creating-custom-windows-byol-images
- Google Cloud: Microsoft licensing on Google Cloud FAQ: https://cloud.google.com/compute/docs/instances/windows/ms-licensing-faq
- Google Cloud: About licenses: https://cloud.google.com/compute/docs/licenses/about
- Google provider docs: `google_compute_node_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_node_template.html.markdown
- Google provider docs: `google_compute_node_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_node_group.html.markdown
- Google provider docs: `google_compute_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown

## Issues Found
- The overview said sole-tenant nodes are required for BYOL in general. I changed this to BYOL scenarios that require dedicated hardware, because Google Cloud documents BYOL requirements as workload- and license-dependent.
- The node template comment implied `cpu_overcommit_type` alone improves utilization. I clarified that it enables CPU overcommit for VMs that also set `min_node_cpus`.
- The node group maintenance comment was imprecise. I changed it to describe hosted VM behavior during node maintenance, which matches the documented meaning of `maintenance_policy`.
- The Step 3 VM image comment implied the public `windows-cloud/windows-2022` image was a BYOL image. I corrected the comment to state that it is a public image with Google-provided licensing.
- The Step 3 example referenced `google_compute_subnetwork.subnet.self_link` without defining that resource. I replaced it with `network = "default"` so the snippet is self-contained.
- The Step 3 example claimed `enable_display = false` enabled BYOL license tracking. That is incorrect because `enable_display` controls virtual display support, so I removed it.
- The Step 4 BYOL example used `windows-cloud/windows-2022-core-for-sole-tenant-byol`, which is not a documented public BYOL image family. I replaced it with a custom imported/built BYOL image reference and clarified that public Windows images are on-demand licensed.
- The Step 4 example also referenced an undefined subnetwork resource. I replaced it with `network = "default"` for the same reason as Step 3.

## Review Notes
- CPU overcommit only takes effect for VMs that set `min_node_cpus`; the post now states this more accurately, but it still does not include a `min_node_cpus` example.
- Windows BYOL on Google Cloud has important licensing caveats. Public Windows images are PAYG, and Windows Server eligibility for BYOL depends on Microsoft's licensing terms and the image import/custom image workflow described in Google Cloud's documentation.
