# Validation Summary: How to Configure IP-Based Access Levels for VPC Service Controls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Access Context Manager
- VPC Service Controls
- Basic access levels
- Ingress policies
- Cloud NAT
- Private Google Access
- Google Cloud CLI
- Python
- YAML

## Sources Consulted
- Google Cloud: Creating a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud SDK: `gcloud access-context-manager levels create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud SDK: `gcloud access-context-manager levels update`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/update
- Google Cloud SDK: `gcloud access-context-manager perimeters update`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud SDK: `gcloud compute routers get-nat-ip-info`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-nat-ip-info
- Google Cloud: Access level attributes: https://cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud: Design access levels for VPC Service Controls: https://cloud.google.com/vpc-service-controls/docs/access-level-design
- Google Cloud: Allow access to protected resources from outside a perimeter: https://cloud.google.com/vpc-service-controls/docs/use-access-levels
- Google Cloud: Ingress and egress rules: https://cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud: Allow access to protected resources from an internal IP address: https://cloud.google.com/vpc-service-controls/docs/enable-internal-ip-access
- Google Cloud: VPC Service Controls audit logging: https://cloud.google.com/vpc-service-controls/docs/audit-logging

## Issues Found
- The `--basic-level-spec` YAML examples used a top-level `conditions:` object. The gcloud command expects a YAML-formatted list of condition objects. Updated all basic access-level YAML examples and the Python automation example to emit a list.
- Access level names used hyphens, such as `office-networks` and `vpn-access`. Google Cloud access level IDs must use letters, numbers, and underscores. Updated resource IDs to `office_networks`, `vpn_access`, and `all_networks`.
- The office access-level example included `100.64.0.0/10` as an IP allowlist range. VPC Service Controls IP-based allowlists use public IP CIDR ranges. Removed the private/CGNAT range from the public IP example.
- The Cloud NAT guidance incorrectly said to allow Cloud NAT external IPs for GCE access to Google APIs. Google documents that Cloud NAT with Private Google Access keeps Google API traffic internal and redacts the caller IP, so the right control is an ingress rule based on project, VPC network, or service account. Rewrote that section accordingly.
- The post suggested allowing Cloud Shell IP ranges. Google recommends Cloud Workstations because VPC Service Controls does not support Cloud Shell. Replaced that inventory item.
- The combined access-level example implied top-level conditions are always ORed. The combine behavior is controlled by `--combine-function`; updated the note to require `--combine-function=OR` for the shown dependency pattern.
- The Cloud Logging filter used `protoPayload.metadata.@type`, but official sample filters quote the special field name as `protoPayload.metadata."@type"`. Updated the command.
- The ingress snippets allowed all services with `serviceName: "*"` and also included wildcard method selectors. A single `serviceName: "*"` already allows all methods and permissions for all services, so the redundant method selectors were removed.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI verification used official Google Cloud SDK reference documentation instead of local `--help`.
- YAML snippets were parsed locally with PyYAML after edits.
