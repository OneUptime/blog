# Validation Summary: How to Run Connectivity Tests Between VM Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Network Intelligence Center
- Connectivity Tests
- Network Management API
- Google Cloud CLI
- VPC networks
- VPC Network Peering
- Compute Engine firewall rules
- VPC Flow Logs

## Sources Consulted
- Connectivity Tests overview: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/overview
- Create and run Connectivity Tests: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Connectivity Tests gcloud reference: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/reference/gcloud-sdk
- `gcloud network-management connectivity-tests create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Connectivity Tests REST API reference: https://docs.cloud.google.com/network-intelligence-center/docs/reference/networkmanagement/rest/v1/projects.locations.global.connectivityTests
- Connectivity Tests roles and permissions: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/access-control
- Network Management API IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/networkmanagement
- Connectivity Tests quotas and limits: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/resources/quotas

## Issues Found
- The post said Connectivity Tests do not send actual packets. Google Cloud now documents that Connectivity Tests always run configuration analysis and can also perform live data plane analysis for supported scenarios. I updated the explanation and limits section to reflect that.
- The post listed only three possible overall results. The Network Management API also documents `UNKNOWN`, which can occur when analysis cannot complete, such as missing resources or insufficient permissions. I added this result to the explanation.
- The firewall example described a "default deny ingress rule" as if it were necessarily a named firewall rule. Google Cloud has implied firewall behavior, and traces can also show explicit deny rules. I changed the wording to "an ingress deny rule."
- The firewall fix used `--target-tags=database` but did not state that the destination VM must have that tag. I clarified that the rule applies to database VMs tagged with `database`.
- The VPC peering drop snippet used `dropCause` and a route-based shape that does not match the current REST trace schema. I replaced it with a `DROP` step using `drop.cause: NO_ROUTE`.
- The post stated a fixed default quota of 50 connectivity tests per project. The current Google Cloud quotas page exposes quota management but does not document that fixed number. I changed the wording to tell readers to check the current project quota before creating many tests.

## Review Notes
- The `gcloud network-management connectivity-tests create`, `describe`, and `rerun` command group and the flags used in the examples are current in the official Google Cloud CLI reference.
- The local environment does not have `gcloud` installed, so command verification was done against official Google Cloud CLI documentation rather than local `--help` output.
