# Validation Summary: What Is MongoDB Atlas and How It Differs from Self-Hosted

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- MongoDB Atlas (managed cloud database)
- MongoDB self-hosted (Community/Enterprise)
- Node.js MongoDB driver
- Ubuntu package management (apt)

## Sources Consulted
- MongoDB Atlas documentation on cluster tiers and Flex clusters (https://www.mongodb.com/docs/atlas/)
- MongoDB Atlas deprecation notices for Data API and App Services (September 2024 announcements, EOL September 2025)
- MongoDB Atlas Flex cluster documentation (replacement for M2/M5 shared tiers)
- MongoDB installation documentation for Ubuntu (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- Other posts in this blog that reference Flex tiers: `mongodb-atlas-flex-cluster-pricing-model`, `mongodb-migrate-shared-to-flex-clusters`, `mongodb-atlas-flex-clusters-low-traffic`
- Other posts in this blog using modern GPG key management: `mongodb-install-configure-mongosh`, `mongodb-deploy-on-digitalocean-droplets`

## Issues Found

1. **M2/M5 shared tiers listed in pricing (deprecated):** The post listed M2 ($9/month) and M5 ($25/month) as shared tiers. MongoDB deprecated these in favor of Flex clusters (consumption-based billing, up to 5GB storage). Other posts in this blog explicitly document this migration. Updated the pricing section to list M0 (Free) and Flex tiers instead.

2. **Data API listed as Atlas feature (deprecated and removed):** The Atlas Data API was deprecated in September 2024 with end-of-life September 2025. By the post date (March 2026), it no longer exists. Removed from the Atlas-specific features list.

3. **App Services listed as Atlas feature (deprecated and removed):** Atlas App Services (serverless functions, Device Sync, and triggers as a bundle) was deprecated in September 2024 with end-of-life September 2025. Atlas Triggers was migrated to a standalone feature. Replaced the "App Services" entry with "Atlas Triggers" to reflect the current offering.

4. **Self-hosted setup uses deprecated `apt-key` and EOL Ubuntu codename:** The installation commands used `sudo apt-key add -` which has been deprecated since Ubuntu 21.10+. The repository also referenced `focal` (Ubuntu 20.04), which is past standard support (ended April 2025). Updated to use the modern `gpg --dearmor` approach with `/usr/share/keyrings/` and changed the Ubuntu codename to `jammy` (22.04 LTS), consistent with other posts in this blog.

## Review Notes
- The dedicated tier pricing (M10, M20, M40, M80) uses approximate values with `~` prefix, which is appropriate since prices vary by region and cloud provider. These are in the right ballpark but may drift over time.
- The Node.js connection code snippet uses `require()` (CommonJS). This is still valid but ES module `import` syntax is increasingly common. Not an error — just a style note.
- The `w=majority` in the connection string is redundant with MongoDB driver 5.0+ defaults but is not incorrect.
