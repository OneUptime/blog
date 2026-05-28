# Validation Summary: How to Configure Identity-Aware Proxy with BeyondCorp for SSH and TCP Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Identity-Aware Proxy
- BeyondCorp and Access Context Manager access levels
- Compute Engine VMs
- Google Cloud CLI
- SSH, RDP, and TCP forwarding
- Cloud IAM and Cloud Audit Logs
- Cloud NAT and Private Google Access

## Sources Consulted
- Google Cloud IAP TCP forwarding documentation: https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud IAP TCP forwarding overview: https://cloud.google.com/iap/docs/tcp-forwarding-overview
- Google Cloud CLI reference for `gcloud compute ssh`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud CLI reference for `gcloud compute start-iap-tunnel`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/start-iap-tunnel
- Google Cloud CLI reference for `gcloud compute config-ssh`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/config-ssh
- Google Cloud IAP audit logging documentation: https://docs.cloud.google.com/iap/docs/audit-log-howto
- Google Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud Private Google Access documentation: https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud OS Login setup documentation: https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin

## Issues Found
- The note about VMs without external IPs said Cloud NAT or Private Google Access can be used to reach the internet. Private Google Access is for Google APIs and services, not general internet egress, so the note now distinguishes Cloud NAT from Private Google Access.
- The `gcloud compute config-ssh` section said adding `--tunnel-through-iap` configures IAP tunneling. Current `gcloud compute config-ssh` documentation does not list that flag, so the text now recommends using `ProxyCommand` or `gcloud compute ssh --tunnel-through-iap --dry-run`.
- The BeyondCorp access level example used `gcloud iap tcp add-iam-policy-binding`, which is not a current valid command for Compute Engine VM IAP tunnel resources. It now uses `gcloud projects add-iam-policy-binding` with an IAM condition for port 22 and the access level.
- The audit logging section said all tunnel connections are logged without qualification. The text now notes that the relevant Data Access logs must be enabled.

## Review Notes
The remaining firewall rules, IAP source range, `gcloud compute ssh --tunnel-through-iap`, `gcloud compute start-iap-tunnel`, OS Login role example, and IAP idle timeout guidance match current Google Cloud documentation.
