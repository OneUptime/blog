# Validation Summary: How to Set Up WordPress Multisite on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Virtual Machines
- Azure Virtual Network and Network Security Groups
- Azure Load Balancer
- Azure Files NFS shares and Private Endpoint
- Azure Database for MySQL Flexible Server
- WordPress Multisite
- Nginx
- PHP-FPM
- Azure Cache for Redis
- Cloud-init

## Sources Consulted
- Microsoft Learn: NFS Azure file shares: https://learn.microsoft.com/en-us/azure/storage/files/files-nfs-protocol
- Microsoft Learn: Mount NFS Azure file shares on Linux: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-how-to-mount-nfs-shares
- Microsoft Learn: Encryption in transit for NFS Azure file shares: https://learn.microsoft.com/en-us/azure/storage/files/encryption-in-transit-for-nfs-shares
- Microsoft Learn: Azure CLI `az storage account file-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/file-service-properties
- Microsoft Learn: Azure Database for MySQL Flexible Server private network access: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-networking-vnet
- Microsoft Learn: Azure CLI `az mysql flexible-server`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Microsoft Learn: Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Public Azure Load Balancer is a Layer 4 solution: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-load-balancer
- Microsoft Learn: Azure Load Balancer outbound rules and SNAT: https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- WordPress Developer Resources: Create a Network / Multisite constants: https://developer.wordpress.org/advanced-administration/multisite/create-network/
- PhpRedis README: PHP session handler and TLS connection examples: https://github.com/phpredis/phpredis
- Canonical Ubuntu on Azure documentation: https://documentation.ubuntu.com/azure/azure-how-to/instances/launch-ubuntu-images/

## Issues Found
- The MySQL Flexible Server command used the same subnet as the VMs. Azure Database for MySQL Flexible Server private access requires a delegated subnet that is used only for MySQL flexible servers, so I added a separate `snet-mysql` subnet and updated the MySQL command to use it with a private DNS zone.
- The Azure Files private endpoint did not configure private DNS. Without the `privatelink.file.core.windows.net` zone and DNS zone group, VMs may resolve the storage account to the public endpoint and fail NFS access. I added private DNS zone creation, VNet linking, and DNS zone group association.
- The NFS mount used native NFS but did not account for Azure Files NFS encryption-in-transit settings. I added the current Azure CLI command to disable required NFS encryption for native NFS mounts and updated the mount/fstab options to match Microsoft examples more closely.
- The cloud-init snippet used Ubuntu 22.04 with PHP 8.2 packages. Ubuntu 22.04 does not provide those packages from the default repositories. I changed the VM image to Ubuntu 24.04 and updated package names, service names, and PHP-FPM socket paths to PHP 8.3.
- Nginx was installed but never configured to serve `/var/www/wordpress` or pass PHP requests to PHP-FPM. I added a minimal Nginx site configuration in cloud-init.
- The load balancer section configured an HTTPS rule while the VMs were not configured with TLS certificates on port 443. Azure Load Balancer is Layer 4 and does not terminate HTTPS or set `X-Forwarded-Proto`, so I removed the HTTPS load-balancing rule and clarified that forwarded-protocol handling applies only if a TLS-terminating reverse proxy is added later.
- The session-handling section stated that PHP sessions are required for WordPress user sessions across VMs. WordPress core authentication uses cookies, not PHP sessions. I changed the text to scope Redis-backed PHP sessions to plugins and custom code that actually use PHP sessions.
- The Redis session snippet referenced the PHP Redis extension but did not install it, and the TLS connection string used a nonstandard `tls=1` query parameter. I added `php8.3-redis` to the VM packages and changed the session path to use the `tls://` scheme used by PhpRedis.

## Review Notes
- The guide is now technically coherent as an HTTP deployment behind Azure Load Balancer. A production deployment should still add TLS termination, a certificate-management approach, secret handling that does not hard-code database passwords, an outbound connectivity plan for private VMs, and a more robust WordPress health-check endpoint.
