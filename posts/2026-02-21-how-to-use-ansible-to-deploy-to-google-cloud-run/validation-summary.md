# Validation Summary: How to Use Ansible to Deploy to Google Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud CLI (`gcloud`)
- Google Cloud Run
- Cloud Run traffic splitting and revision tags
- Google Secret Manager integration with Cloud Run
- Cloud Run custom domain mappings
- Ansible modules including `ansible.builtin.command`, `ansible.builtin.uri`, `community.general.timezone`, and `community.general.ufw`

## Sources Consulted
- Google Cloud SDK reference: `gcloud run deploy` - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: `gcloud run services describe` - https://cloud.google.com/sdk/gcloud/reference/run/services/describe
- Google Cloud SDK reference: `gcloud run services update-traffic` - https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Google Cloud Run docs: rollbacks, gradual rollouts, and traffic migration - https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud Run docs: HTTPS request and service URL formats - https://cloud.google.com/run/docs/triggering/https-request
- Google Cloud Run REST reference: `TrafficTarget` tagged URL field - https://cloud.google.com/run/docs/reference/rest/v1/TrafficTarget
- Google Cloud Run docs: mapping custom domains - https://cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud SDK reference: `gcloud beta run domain-mappings create` - https://cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings/create
- Google Cloud Run docs: managing revisions - https://cloud.google.com/run/docs/managing/revisions
- Google Cloud SDK reference: `gcloud auth login` - https://cloud.google.com/sdk/gcloud/reference/auth/login
- Google Cloud SDK reference: `gcloud auth application-default login` - https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- Ansible documentation: `ansible.builtin.command` - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: `ansible.builtin.uri` - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: `community.general.timezone` - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: `community.general.ufw` - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The prerequisites installed `google.cloud` and Google API Python libraries, but the examples use `gcloud` through `ansible.builtin.command`, not Google Cloud Ansible modules or Python client libraries. Replaced that prerequisite with `community.general`, which is required by the later `community.general.timezone` and `community.general.ufw` examples.
- The authentication snippet used `gcloud auth application-default login`, which configures Application Default Credentials for client libraries rather than the active credentials used by `gcloud` commands. Changed it to `gcloud auth login` and added `gcloud config set project`.
- The Cloud Run snippets used the older `--platform managed` flag. Current official `gcloud run` references for deploy, describe, traffic update, and revisions do not list this flag, so it was removed from the commands.
- The canary health check constructed a tagged revision URL using an undefined `gcp_run_hash` variable. Cloud Run's non-deterministic service identifier must not be predicted or parsed. Changed the example to read the service JSON and use the tagged traffic target URL exposed in `status.traffic`.
- The canary `uri` task had retries without an `until` condition. Added `until: canary_health.status == 200` to make the retry behavior explicit and consistent with the earlier health check.
- The custom domain mapping command used `gcloud run domain-mappings create`, but the fully managed Cloud Run documentation uses `gcloud beta run domain-mappings create`. Updated the command and added the current Preview and regional limitation caveat.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current module is `community.general.timezone`. Updated the FQCN.

## Review Notes
- The Secret Manager example uses `latest` for environment variable secret versions. This is supported by `gcloud run deploy --set-secrets`, but Google recommends pinning environment variable secrets to a specific version because environment variables are resolved at instance startup.
- The cleanup example can still fail if an old revision is receiving traffic, is the only revision, or is the latest revision; Cloud Run rejects deletion in those cases. This is an operational caveat rather than a syntax error.
