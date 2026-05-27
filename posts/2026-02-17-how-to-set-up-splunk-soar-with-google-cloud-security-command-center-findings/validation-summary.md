# Validation Summary: How to Set Up Splunk SOAR with Google Cloud Security Command Center Findings

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Google Cloud Security Command Center
- Google Cloud Pub/Sub
- Google Cloud IAM
- Google Cloud Monitoring
- Splunk platform
- Splunk SOAR
- Splunk SOAR Python playbooks

## Sources Consulted
- Google Cloud Security Command Center Pub/Sub notification documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-notifications
- Google Cloud Security Command Center Splunk integration documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-configure-scc-splunk
- Google Cloud SDK reference for `gcloud scc notifications create`: https://cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud SDK reference for `gcloud scc findings create`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/findings/create
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Splunk SOAR app and asset documentation: https://help.splunk.com/en/splunk-soar/soar-cloud/administer-soar-cloud/manage-your-splunk-soar-cloud-apps-and-assets/add-and-configure-apps-and-assets-to-provide-actions-in-splunk-soar-cloud
- Splunk SOAR playbook automation API reference: https://help.splunk.com/en/splunk-soar/soar-cloud/develop-apps/python-playbook-api-reference/automation-api/playbook-automation-api
- Splunk SOAR data access API reference: https://docs.splunk.com/Documentation/SOAR/current/PlaybookAPI/DataAccessAPI
- Splunkbase Google Cloud Compute Engine SOAR app listing: https://splunkbase.splunk.com/app/6024
- Splunkbase Google Cloud IAM SOAR app listing: https://splunkbase.splunk.com/app/5967
- Splunk SOAR Google Cloud IAM connector documentation/source: https://github.com/splunk-soar-connectors/googlecloudiam

## Issues Found
- The original architecture claimed Splunk SOAR directly polls SCC Pub/Sub notifications or receives webhooks. Google documents SCC-to-Splunk ingestion through the Google SCC Add-on/App for Splunk, with SOAR receiving events from Splunk. Updated the architecture and configuration text accordingly.
- The post referenced a "Google Cloud Security Command Center" app in the Splunk SOAR app store. I could not verify an SCC-specific SOAR connector; the documented apps are the Splunk Google SCC add-on/app for Splunk platform ingestion and separate Google Cloud Compute/IAM SOAR apps for response actions. Updated the app setup instructions.
- The SCC notification command omitted `--location=global`, which is recommended for the current SCC API path. Added the location flag.
- The SCC test finding command used a full source path, included unsupported `--severity`, and omitted `--event-time`. Updated it to use a source ID, explicit location, and event time.
- The Cloud Monitoring alert command used non-existent threshold flags. Replaced them with the documented `--duration` and `--if='> 100'` flags.
- The SOAR playbook examples used invalid `phantom.collect2(filter_func=...)` and passed app names as strings to `phantom.act`. Updated the snippets to use supported `collect2` parameters, import `phantom.rules`, filter in Python, and use `assets=[...]`.
- The firewall playbook used an unsupported Google Cloud Compute Engine SOAR action for changing firewall rules. Changed it to a supported escalation pattern that raises severity and creates a remediation ticket.
- The IAM playbook used an unsupported action name and parameter for service account lookup. Updated it to use the Google Cloud IAM app's `get serviceaccount` action with the required `account` parameter.
- Replaced references to the Splunk SOAR "mission control dashboard" and SOAR Pub/Sub lag with more accurate Splunk SOAR/container and Splunk input backlog wording.

## Review Notes
The post is now technically accurate as a Splunk-to-SOAR workflow. Fully automated firewall remediation would require a supported custom SOAR connector, a custom function, or another approved automation path because the verified Splunk SOAR Google Cloud Compute Engine app listing does not expose a firewall rule update action.
