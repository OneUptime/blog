# Validation Summary: How to Create Private Endpoints Across Cloud Providers

## Status
validated

## Post Type
Tutorial / Guide (multi-cloud Terraform reference)

## Technologies Covered
- Terraform (HCL)
- AWS VPC Endpoints (Gateway + Interface)
- Azure Private Endpoints and Private DNS Zones
- GCP Private Service Connect (global + regional forwarding rules)
- Cloud DNS, Cloud SQL PSC integration
- Terraform providers: `hashicorp/aws`, `hashicorp/azurerm` (v4.x), `hashicorp/google` (v5.x+)

## Sources Consulted
- [azurerm_subnet — Terraform Registry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet)
- [AzureRM provider 4.0 upgrade notes — HashiCorp Discuss](https://discuss.hashicorp.com/t/azurerm-provider-4-0/50939)
- [azurerm_private_endpoint — Terraform Registry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint)
- [Azure Private Endpoint private DNS zone values — Microsoft Learn](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Gateway endpoints — Amazon VPC PrivateLink docs](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html)
- [google_compute_global_forwarding_rule — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule)
- [google_compute_global_address — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address)
- [google_compute_subnetwork — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork)
- [Connecting to Cloud SQL via Private Service Connect (Terraform) — Google Codelab](https://codelabs.developers.google.com/codelabs/cloudsql-psc-terraform)

## Issues Found

1. **Azure subnet — deprecated/removed argument and misleading comment.**
   The dedicated subnet block used `private_endpoint_network_policies_enabled = true` with the comment "Required for private endpoints." This argument was removed in AzureRM provider 4.0 (August 2024) and replaced with the string-valued `private_endpoint_network_policies` (accepts `"Disabled"`, `"Enabled"`, `"NetworkSecurityGroupEnabled"`, `"RouteTableEnabled"`). Additionally, the comment was incorrect — for a subnet hosting private endpoints, network policies should be **disabled** (this is also the AzureRM 4.x default). Updated to `private_endpoint_network_policies = "Disabled"` with a corrected comment.

2. **GCP global address — invalid `prefix_length` for PSC.**
   The `google_compute_global_address` resource used `prefix_length = 32` alongside `purpose = "PRIVATE_SERVICE_CONNECT"`. Per the Google Compute API, `prefix_length` is only valid for `VPC_PEERING` or `IPSEC_INTERCONNECT` purposes — for PSC you reserve a single IP, not a range. Removed `prefix_length`.

3. **GCP subnetwork — invalid `purpose = "PRIVATE"` value.**
   The dedicated GCP subnet used `purpose = "PRIVATE"`, which is not a documented valid value for `google_compute_subnetwork.purpose`. Valid values include `PRIVATE_RFC_1918` (default for general-purpose subnets), `REGIONAL_MANAGED_PROXY`, `GLOBAL_MANAGED_PROXY`, `PRIVATE_SERVICE_CONNECT`, `PEER_MIGRATION`, and `PRIVATE_NAT`. Updated to `PRIVATE_RFC_1918`.

## Review Notes
- All AWS service names (`com.amazonaws.${region}.<service>`) and `aws_vpc_endpoint` argument shapes for both Gateway and Interface types are correct.
- All Azure `subresource_names` (`sqlServer`, `blob`, `vault`) and `privatelink.*` DNS zone names match Microsoft's "Azure Private Endpoint private DNS zone values" reference.
- GCP PSC forwarding rule with `target = "all-apis"` and `load_balancing_scheme = ""` is correct for connecting to Google APIs; `target = "vpc-sc"` is the alternative when VPC Service Controls is required.
- The `google_sql_database_instance.psc_service_attachment_link` attribute reference is valid in `hashicorp/google` v5.x+ (assumes the Cloud SQL instance was created with PSC enabled via `settings.ip_configuration.psc_config`).
- The Azure dedicated-subnet example does not show every PE service's DNS zone (e.g., `privatelink.file.core.windows.net`, `privatelink.documents.azure.com`). Readers connecting other services will need to add the matching zone — not an inaccuracy, just a scope limit.
