# Validation Summary: How to Deploy RHEL 9 on Google Cloud Platform (GCP)

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Google Cloud Platform
- Compute Engine
- Google Cloud CLI
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights
- firewalld
- SELinux

## Sources Consulted
- Google Cloud Compute Engine operating system details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud CLI `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- cloud-init Google Compute Engine datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/gce.html
- Red Hat RHEL 9 cloud-init documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_cloud-init_for_rhel_9
- Red Hat system registration documentation: https://docs.redhat.com/en-us/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/
- Google Cloud Red Hat Enterprise Linux FAQ: https://cloud.google.com/compute/docs/images/premium/rhel-faq

## Issues Found
- The prerequisites and deployment examples referenced AWS and Azure even though the post title and description are specifically for GCP. I changed them to GCP-specific prerequisites and kept the deployment example focused on Compute Engine.
- The GCP instance creation command omitted an explicit zone. While `gcloud` can use configured defaults, the command is clearer and more reliably runnable with `--zone=us-central1-a`, so I added it.
- The cloud-init section showed a valid cloud-config snippet but did not show how to provide it to a GCP instance. I added `--metadata-from-file=user-data=cloud-config.yaml`, which matches cloud-init's GCE datasource behavior.
- The cloud-init `users` example replaced the default user without preserving it. I added `- default` and a sudo rule for the added admin user, matching Red Hat cloud-init guidance for adding users.
- The registration step implied all GCP RHEL 9 instances should use `subscription-manager`. Google Cloud pay-as-you-go RHEL images use Google's RHUI and do not use `subscription-manager`, so I clarified that `subscription-manager` applies to BYOS or custom images.

## Review Notes
- Google Cloud documents RHEL 9 in the `rhel-cloud` image project with the `rhel-9` x86 image family, so the corrected Compute Engine image selection is valid.
- The post remains a high-level guide. A future improvement could add project selection, firewall rule examples, and SSH setup, but those are omissions rather than technical errors in the current scope.
