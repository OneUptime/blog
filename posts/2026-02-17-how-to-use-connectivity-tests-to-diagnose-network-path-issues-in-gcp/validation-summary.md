# Validation Summary: How to Use Connectivity Tests to Diagnose Network Path Issues in GCP

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Connectivity Tests
- Network Intelligence Center
- Google Cloud CLI (`gcloud network-management connectivity-tests`)
- Compute Engine VPC routes and firewall rules
- VPC Network Peering
- Cloud Scheduler
- Private Google Access / Google APIs access

## Sources Consulted
- Google Cloud Connectivity Tests overview: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/overview
- Google Cloud Connectivity Tests reachability model: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/reachability
- Google Cloud configuration analysis states: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/state-tables
- Google Cloud create and run Connectivity Tests guide: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Google Cloud Network Management API Connectivity Tests REST reference: https://docs.cloud.google.com/network-intelligence-center/docs/reference/networkmanagement/rest/v1/projects.locations.global.connectivityTests
- Google Cloud CLI reference for `gcloud network-management connectivity-tests create`: https://docs.cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Google Cloud CLI reference for `gcloud network-management connectivity-tests`: https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests
- Google Cloud Private Google Access configuration guide: https://cloud.google.com/vpc/docs/configure-private-google-access

## Issues Found
- The post stated that Connectivity Tests does not send packets. Current Google Cloud documentation says Connectivity Tests always performs configuration analysis and, for supported scenarios, can also perform live data plane analysis by sending probe packets. Updated the introduction and "What Connectivity Tests Do" section to reflect both behaviors.
- The interpretation section listed only `REACHABLE`, `UNREACHABLE`, and `AMBIGUOUS`, and described `AMBIGUOUS` too broadly. Added `UNDETERMINED` and corrected the meaning of `AMBIGUOUS` based on the API and state documentation.
- The trace-step explanation described actions as `APPLY`, `DROP`, and `FORWARD`. The API exposes ordered `steps` with a `state` and associated metadata. Updated the wording to describe states such as configuration check, forward, drop, abort, and deliver.
- The Cloud Storage API example used an arbitrary Google IP address. Updated it to use `199.36.153.8`, part of the documented `private.googleapis.com` range used for Google APIs and services with Private Google Access.
- The missing-route example showed `state: ABORT` and `abortInfo.cause: NO_ROUTE`. The Network Management API documents `NO_ROUTE` as a `DropInfo` cause, so the example now uses `state: DROP` and `dropInfo`.
- The automation script always used `--destination-instance`, even for the `web-to-internet` test whose destination is an IP address. Added a small conditional so IPv4 destinations use `--destination-ip-address` and VM names use `--destination-instance`.

## Review Notes
The `gcloud` binary was not installed in the workspace, so CLI validation was performed against official Google Cloud CLI reference pages and Network Management API documentation. The examples use placeholder project, instance, and IP values; they still require appropriate IAM permissions, enabled APIs, and matching network resources in a real environment.
