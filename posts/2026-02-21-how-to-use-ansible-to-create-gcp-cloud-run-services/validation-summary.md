# Validation Summary: How to Use Ansible to Create GCP Cloud Run Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Google Cloud Run
- Google Cloud CLI
- Artifact Registry
- Serverless VPC Access
- Cloud Run traffic splitting
- Cloud Run custom domain mappings
- Docker containers

## Sources Consulted
- Google Cloud SDK reference for `gcloud run deploy`: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference for `gcloud run services update-traffic`: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Google Cloud SDK reference for Serverless VPC Access connector creation: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Cloud Run VPC connector configuration: https://cloud.google.com/run/docs/configuring/vpc-connectors
- Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- Cloud Run service identity documentation: https://cloud.google.com/run/docs/configuring/services/service-identity
- Cloud Run autoscaling documentation: https://cloud.google.com/run/docs/about-instance-autoscaling
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.pause` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html

## Issues Found
- The prerequisites said to install the `google.cloud` Ansible collection and Python client libraries, but the playbooks use `ansible.builtin.command` with the Google Cloud CLI. I changed the prerequisites to require Ansible and an authenticated Google Cloud CLI instead.
- The prerequisites only mentioned the Cloud Run Admin role. Because the examples attach service accounts with `--service-account`, the deployer also needs permission to act as those service accounts. I added the Service Account User role requirement.
- The API enablement command did not include the Serverless VPC Access API, even though a later example creates a VPC connector. I added `vpcaccess.googleapis.com`.
- The VPC egress explanation said `private-ranges-only` routes only RFC 1918 traffic. Google documents additional internal IPv4 destinations, including RFC 6598 and private/restricted Google API ranges. I updated the wording.
- The canary example used `ansible.builtin.pause` with both `seconds` and a prompt that told users to press Enter. Ansible does not return user input for timed pauses. I removed `seconds` so the task actually waits for the prompt to be acknowledged.
- The custom-domain commands used `gcloud run domain-mappings`, but Google documents Cloud Run domain mappings under `gcloud beta run domain-mappings`. I updated the create and describe commands.
- The custom-domain debug message said DNS should point to a provided IP, but Cloud Run returns `resourceRecords` that can include A, AAAA, or CNAME records. I changed the message to reference the returned DNS records.

## Review Notes
The remaining examples are CLI-driven Ansible tasks and are not fully idempotent because several deployment tasks use `changed_when: true`. That is acceptable for the tutorial's deploy workflow, but a future revision could improve idempotency by checking current Cloud Run service state before deploying. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation.
